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
        const requiredFilePath = path.resolve(`./HTML/${filename}`);
        if (!await fs.pathExists(requiredFilePath)) {
            console.log(`\x1b[1m\x1b[31mError: required file "${filename}" is missing\x1b[0m`);
            return;
        }
        else {
            if (path.extname(requiredFilePath) === ".html") {
                htmlFiles[filename] = await fs.readFile(requiredFilePath, "utf8");
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
        const dom = new JSDOM(stripComments(html, { language: "html" }));
        const document = dom.window.document;

        console.log("Scripts...");
        if (!await transform.scripts(filename, document, tr)) return;

        console.log("Styles...");
        if (!await transform.styles(filename, document, tr)) return;

        console.log("Assets...");
        if (!await transform.assets(filename, document, tr)) return;

        if (filename === tr.indexFile) {
            console.log("Check external references...");

            const scripts = Array.prototype.slice.call(document.getElementsByTagName("script"));
            for (const script of scripts) {
                if (script.hasAttribute("src")) {
                    const src = script.getAttribute("src");
                    if (src.startsWith("https://") || src.startsWith("http://")) {
                        if (tr.externalLinks === false)
                            console.log(`\x1b[1m\x1b[31mWarning: external references are not allowed for the specified platform\x1b[0m`);
                        else if ("externalLinksDomain" in tr) {
                            const domain = tr.externalLinksDomain;
                            const url = new URL(src);
                            const hostname = url.hostname;
                            if (hostname !== domain)
                                console.log(`\x1b[1m\x1b[31mWarning: external references are restricted to domain "${domain}" for the specified platform\x1b[0m`);
                        }
                    }
                }
            }

            const links = Array.prototype.slice.call(document.getElementsByTagName("link"));
            for (const link of links) {
                if (link.hasAttribute("href")) {
                    const src = script.getAttribute("href");
                    if (src.startsWith("https://") || src.startsWith("http://")) {
                        if (tr.externalLinks === false)
                            console.log(`\x1b[1m\x1b[31mWarning: external references are not allowed for the specified platform\x1b[0m`);
                        else if ("externalLinksDomain" in tr) {
                            const domain = tr.externalLinksDomain;
                            const url = new URL(src);
                            const hostname = url.hostname;
                            if (hostname !== domain)
                                console.log(`\x1b[1m\x1b[31mWarning: external references are restricted to domain "${domain}" for the specified platform\x1b[0m`);
                        }
                    }
                }
            }

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
        const htmlOutput = beautify(dom.serialize(), { 
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

    console.log("Check build files...");
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
            console.log(`\x1b[1m\x1b[31mWarning: file "${filename}" is not allowed for the specified platform\x1b[0m`);
        }
    }

    let fallbackPath = "";
    if ("fallback" in tr) {
        if (tr.fallback.required === true) {
            const fallbackPaths = [
                path.resolve("./HTML/fallback.gif"),
                path.resolve("./HTML/fallback.jpg"),
                path.resolve("./HTML/fallback.png")
            ];

            for (const fPath of fallbackPaths) {
                if (await fs.pathExists(fPath)) {
                    if ("formats" in tr.fallback) {
                        const format = path.extname(fPath).split(".").pop();
                        if (tr.fallback.formats.includes(format)) {
                            fallbackPath = fPath;
                            break;
                        }
                    }
                    else {
                        fallbackPath = fPath;
                        break;
                    }
                }
            }
        }
    }

    if (platformId === "publish") {
        const previewInputPath = path.resolve("./HTML/preview.html");
        if (await fs.pathExists(previewInputPath)) {
            const previewOutputPath = path.resolve("./build/preview.html");
            await fs.copyFile(previewInputPath, previewOutputPath);
        }
    }
    
    console.log("Archive...");
    // TODO: respect tr.dist.format
    await archive(tr, platformId, config, banner, fallbackPath);
}

module.exports = build;
