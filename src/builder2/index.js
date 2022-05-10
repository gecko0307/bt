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

        console.log("Prepare...");
        if (!await transform.prepare(filename, document, tr)) return;

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

    // TODO: fallback
    // TODO: preview.html
    
    const archivePath = await archive();

    // TODO: check archive size

    console.log("Done");
}

module.exports = build;
