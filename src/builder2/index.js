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
const chalk = require("chalk");

const log = require("./logger").createLogger({
    printInfo: true,
    printWarnings: false,
    printErrors: true
});

function requireUncached(module) {
    delete require.cache[require.resolve(module)];
    return require(module);
}

const builderConfigPath = path.resolve("./.data/builder.config.json");
const buildPath = path.resolve("./build");

const configDefault = {
    brand: "",
    campaign: "banner",
    creative: "",
    platform: "publish",
    version: "v1"
};

async function buildConfig() {
    let config = {};
    if (await fs.pathExists(builderConfigPath)) {
        config = requireUncached(builderConfigPath) || {};
    }
    config = fillMissing(config, configDefault);
    return config;
}

async function build(options = { platform: "publish" }) {
    log.clear();
    const config = await buildConfig();
    
    config.brand = options.brand || config.brand;
    config.campaign = options.campaign || config.campaign;
    config.creative = options.creative || config.creative;
    config.version = options.version || config.version;
    config.size = options.size || config.size;

    if (options.platform === "publish") {
        options.platform = config.platform;
    }
    else {
        config.platform = options.platform;
    }

    await fs.writeJSON(builderConfigPath, config, { spaces: "\t" });

    const platformId = options.platform;
    const { tr, platformName } = await requirements(platformId);
    const strip = (platformId === "strip");

    log.info("Platform:", platformName, `(${platformId})`);
    log.info("Technical requirements:", tr.name, `(${tr.id})`);
    log.info("Version:", config.version);

    fs.emptyDirSync(buildPath);

    const htmlFiles = {};

    log.info("Checking required files...");
    for (filename of tr.requiredFiles) {
        const requiredFilePath = path.resolve(`./HTML/${filename}`);
        if (!await fs.pathExists(requiredFilePath)) {
            log.error(`Error: required file "${filename}" is missing`);
            return {
                ok: false
            };
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
        height: 0,
        isResponsive: false
    };

    for (filename of Object.keys(htmlFiles)) {
        log.info(`Processing "${filename}"...`);
        const html = htmlFiles[filename];
        const dom = new JSDOM(stripComments(html, { language: "html" }));
        const document = dom.window.document;

        log.info("Scripts...");
        if (!await transform.scripts(filename, document, tr)) {
            return {
                ok: false
            };
        }

        log.info("Styles...");
        if (!await transform.styles(filename, document, tr)) {
            return {
                ok: false
            };
        }

        log.info("Assets...");
        if (!await transform.assets(filename, document, tr)) {
            return {
                ok: false
            };
        }

        if (filename === tr.indexFile) {
            log.info("Check external references...");

            const scripts = Array.prototype.slice.call(document.getElementsByTagName("script"));
            for (const script of scripts) {
                if (script.hasAttribute("src")) {
                    const src = script.getAttribute("src");
                    if (src.startsWith("https://") || src.startsWith("http://")) {
                        if (tr.externalLinks === false)
                            log.warn("Warning: external references are not allowed for the specified platform");
                        else if ("externalLinksDomain" in tr) {
                            const domain = tr.externalLinksDomain;
                            const url = new URL(src);
                            const hostname = url.hostname;
                            if (hostname !== domain)
                                log.warn(`Warning: external references are restricted to domain "${domain}" for the specified platform`);
                        }
                    }
                }
            }

            const links = Array.prototype.slice.call(document.getElementsByTagName("link"));
            for (const link of links) {
                if (link.hasAttribute("href")) {
                    const src = link.getAttribute("href");
                    if (src.startsWith("https://") || src.startsWith("http://")) {
                        if (tr.externalLinks === false)
                            log.warn("Warning: external references are not allowed for the specified platform");
                        else if ("externalLinksDomain" in tr) {
                            const domain = tr.externalLinksDomain;
                            const url = new URL(src);
                            const hostname = url.hostname;
                            if (hostname !== domain)
                                log.warn(`Warning: external references are restricted to domain "${domain}" for the specified platform`);
                        }
                    }
                }
            }

            log.info("Get banner size...");

            function waitResourcesLoaded(resolve, reject) {
                const container = dom.window.document.getElementById("container");
                if (container) {
                    const style = dom.window.getComputedStyle(container);
                    const width = style.getPropertyValue("width");
                    const height = style.getPropertyValue("height");
                    if (width && width.length > 0)
                        resolve({ width, height });
                    else
                        setTimeout(waitResourcesLoaded.bind(this, resolve, reject), 100);
                }
                else {
                    resolve({ width: "0", height: "0" });
                }
            }
    
            const bannerLoad = new Promise(waitResourcesLoaded);
            const { width, height } = await bannerLoad;
            banner.width = width.replace(/px/g, "");
            banner.height = height.replace(/px/g, "");
            
            if (config.size) {
                const params = config.size.split("x");
                banner.width = params[0] || banner.width;
                banner.height = params[1] || banner.height;
            }
            
            banner.isResponsive = banner.width.endsWith("%") || banner.height.endsWith("%");

            log.info("Prepare...");
            if (!await transform.prepare(filename, document, tr, { banner, config })) {
                return {
                    ok: false
                };
            }
        }

        log.info("Serialize...");
        let htmlOutput = "";
        if (strip === true) {
            htmlOutput = await transform.strip(filename, document, { banner, config });
        }
        else {
            htmlOutput = dom.serialize();
        }
        htmlOutput = beautify(htmlOutput, { 
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

    log.info("Check build files...");
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
        log.warn(`Warning: number of files exceeds maximum allowed by the specified platform (${tr.maxFilesNum})`);
    }

    for (const filename of files) {
        if (!isFileAllowed(filename)) {
            log.warn(`Warning: file "${filename}" is not allowed for the specified platform`);
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

    if (tr.fallback.required === true && fallbackPath.length === 0) {
        log.warn("Warning: fallback is required for the specified platform");
    }

    if (platformId === "publish") {
        const previewInputPath = path.resolve("./HTML/preview.html");
        if (await fs.pathExists(previewInputPath)) {
            const previewOutputPath = path.resolve("./build/preview.html");
            await fs.copyFile(previewInputPath, previewOutputPath);
        }
    }
    
    log.info("Archive...");
    // TODO: respect tr.dist.format
    const zipPath = await archive(log, tr, platformId, config, banner, fallbackPath);

    // Build report
    if (log.warningMessages.length > 0) {
        console.log(chalk.redBright("Banner was built with warnings:"));
        log.printWarningMessages();
    }
    else {
        console.log(chalk.greenBright("Everything is OK!"));
    }

    return {
        ok: true,
        archiveFilename: path.basename(zipPath),
        log: log
    };
}

module.exports = { build, buildConfig };
