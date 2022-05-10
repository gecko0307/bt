const fs = require("fs-extra");
const path = require("path");
//const stt = require("spaces-to-tabs");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const { fillMissing } = require("object-fill-missing-keys");
const { requirements, aliases } = require("./platforms");
//const transform = require("./transform");

function requireUncached(module) {
    delete require.cache[require.resolve(module)];
    return require(module);
}

const cwd = process.cwd();

const builderConfigPath = path.resolve("./.data/builder.config.json");

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

    for (filename of Object.keys(htmlFiles)) {
        console.log(`Processing "${filename}"...`);
        const html = htmlFiles[filename];
        const dom = new JSDOM(html);
        const document = dom.window.document;
        //const head = dom.window.document.getElementsByTagName("head")[0];
        //const body = dom.window.document.getElementsByTagName("body")[0];
        //const link = dom.window.document.getElementById("link");

        // TODO: JS
        // TODO: CSS
        // TODO: images
        // TODO: required scripts, tags, attributes
        // TODO: collect assets, replace paths
        // TODO: check external links
    }

    // TODO: check fallback

    console.log("Done");
}

module.exports = build;
