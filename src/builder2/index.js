const fs = require("fs-extra");
const path = require("path");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const stripComments = require("strip-comments");
const beautify = require("js-beautify").html;
const { fillMissing } = require("object-fill-missing-keys");
const { requirements, aliases } = require("./platforms");
const transform = require("./transform");
const archive = require("./archive");

function requireUncached(module) {
    delete require.cache[require.resolve(module)];
    return require(module);
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const cwd = process.cwd();

const builderConfigPath = path.resolve("./.data/builder.config.json");
const buildPath = path.resolve("./build");

const configDefault = {
    brand: "",
    campaign: "banner",
    platform: "publish",
    version: "v1"
};

async function build(options = { platform: "publish" }) {
    let config = {};
    if (await fs.pathExists(builderConfigPath)) {
        config = requireUncached(builderConfigPath) || {};
    }
    config = fillMissing(config, configDefault);
    
    if (options.platform === "publish") {
        options.platform = config.platform;
    }

    // TODO: dynamically load requirement
    const platformId = options.platform;
    let tr = requirements["publish"];
    let platformName = "Undefined";

    if (platformId in requirements) {
        tr = requirements[platformId];
        platformName = tr.name;
    }
    else {
        const alias = aliases[platformId];
        if (alias in requirements) {
            tr = requirements[alias.tr];
            platformName = alias.name;
        }
    }

    console.log("Platform:", platformName, `(${platformId})`);
    console.log("Technical requirements:", tr.name, `(${tr.id})`);
    console.log("Version:", config.version);

    fs.emptyDirSync(buildPath);

    const htmlFiles = {};

    console.log("Checking required files...");
    for (filename of tr.requiredFiles) {
        const requiredFiePath = path.resolve(`./HTML/${filename}`);
        if (!await fs.pathExists(requiredFiePath)) {
            console.log(`Error: required file "${filename}" is missing`);
            return;
        }
        else {
            if (path.extname(requiredFiePath) === ".html") {
                htmlFiles[filename] = await fs.readFile(requiredFiePath, "utf8");
            }
            else {
                const destinationFilePath = path.resolve(`./build/${filename}`);
                await fs.copyFile(requiredFilePath, destinationFilePath);
            }
        }
    }

    const banner = {
        width: 0,
        height: 0
    };

    for (filename of Object.keys(htmlFiles)) {
        console.log(`Processing "${filename}"...`);
        const html = htmlFiles[filename];
        const dom = new JSDOM(html);
        const document = dom.window.document;

        console.log("Scripts...");
        if (!await transform.scripts(filename, document, tr)) return;

        console.log("Styles...");
        if (!await transform.styles(filename, document, tr)) return;

        console.log("Assets...");
        if (!await transform.assets(filename, document, tr)) return;

        if (filename === tr.indexFile) {
            console.log("Get banner size...");

            function waitResourcesLoaded(resolve, reject) {
                const container = dom.window.document.getElementById("container");
                const style = dom.window.getComputedStyle(container);
                const width = style.getPropertyValue("width");
                const height = style.getPropertyValue("height");
                if (width && width.length > 0)
                    resolve({ width, height });
                else
                    setTimeout(waitResourcesLoaded.bind(this, resolve, reject), 100);
            }
    
            const bannerLoad = new Promise(waitResourcesLoaded);
            const { width, height } = await bannerLoad;
            banner.width = width.replace(/px/g, "");
            banner.height = height.replace(/px/g, "");

            console.log("Prepare...");
            if (!await transform.prepare(filename, document, tr, { banner: banner })) return;
        }

        console.log("Serialize...");
        const htmlOutput = beautify(stripComments(dom.serialize(), { language: "html" }), { 
            "indent_with_tabs": true,
            "unformatted": ["style", "script", "sub", "sup", "b", "i", "u"],
            "preserve_newlines": false,
            "end_with_newline": true,
            "indent_scripts": false,
            "extra_liners": []
        });
        const htmlOutputPath = path.resolve(`./build/${filename}`);
        await fs.outputFile(htmlOutputPath, htmlOutput);
    }

    // TODO: check allowed extensions and max number of files in build
    // TODO: fallback
    // TODO: preview.html
    
    console.log("Archive...");
    const zipPath = await archive(platformId, config, banner);
    const { size } = await fs.stat(zipPath);
    const sizeKb = (size / 1024).toFixed(2);
    const color = (sizeKb >= tr.dist.maxSize)? "\x1b[1m\x1b[31m" : "\x1b[1m\x1b[32m"; // Red if too large, green if ok
    const sizeStr = `${color}${formatBytes(size)}\x1b[0m`;
    console.log(`Generated ${zipPath} (${sizeStr})`);

    console.log("Done");
}

module.exports = build;
