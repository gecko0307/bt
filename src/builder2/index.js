const fs = require("fs-extra");
const path = require("path");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const stripComments = require("strip-comments");
const beautify = require("js-beautify").html;
const { fillMissing } = require("object-fill-missing-keys");
const { requirements } = require("./platforms");
const transform = require("./transform");
const archive = require("./archive");
const wcmatch = require("wildcard-match");

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

    const platformId = options.platform;
    const { tr, platformName } = await requirements(platformId);

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

    console.log("Check...");
    const outputPath = path.resolve("./build");
    const matches = tr.allowedFiles.map(wildcard => wcmatch(wildcard));

    function isFileAllowed(filename) {
        for (const isMatch of matches) {
            if (isMatch(filename)) return true;
        }
        return false;
    }

    const files = await fs.readdir(outputPath);

    if (tr.maxFilesNum > 0 && files.length > tr.maxFilesNum) {
        console.log(`\x1b[1m\x1b[31mWarning: number of files exceeds maximum allowed by the specified platform (${tr.maxFilesNum})\x1b[0m`);
    }

    for (const filename of files) {
        if (!isFileAllowed(filename)) {
            // TODO: colored output
            console.log(`\x1b[1m\x1b[31mWarning: file "${filename}" is not allowed for the specified platform\x1b[0m`);
        }
    }

    // TODO: check and copy fallback

    const previewFilename = tr.preview;
    if (previewFilename) {
        const previewInputPath = path.resolve(`./HTML/${previewFilename}`);
        if (fs.pathExistsSync(previewInputPath)) {
            const previewOutputPath = path.resolve(`./build/${previewFilename}`);
            await fs.copyFile(previewInputPath, previewOutputPath);
        }
    }
    
    console.log("Archive...");
    // TODO: respect dist.format
    const zipPath = await archive(platformId, config, banner);
    const { size } = await fs.stat(zipPath);
    const sizeKb = (size / 1024).toFixed(2);
    let color = "\x1b[1m\x1b[32m";
    if (tr.dist.maxSize > 0) {
        color = (sizeKb >= tr.dist.maxSize)? "\x1b[1m\x1b[31m" : "\x1b[1m\x1b[32m"; // Red if too large, green if ok
    }
    const sizeStr = `${color}${formatBytes(size)}\x1b[0m`;
    const zipFilename = path.basename(zipPath);
    console.log(`Generated ${zipFilename} (${sizeStr})`);
    if (tr.dist.maxSize > 0 && sizeKb >= tr.dist.maxSize) {
        console.log(`\x1b[1m\x1b[31mWarning: archive size exceeds maximum allowed by the specified platform (${tr.dist.maxSize} KB)\x1b[0m`);
    }

    console.log("Done");
}

module.exports = build;
