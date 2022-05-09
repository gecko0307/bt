const fs = require("fs-extra");
const path = require("path");
const { fillMissing } = require("object-fill-missing-keys");
const { requirements, aliases } = require("./platforms");

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

    // TODO: check required files
    // TODO: collect assets, replace paths, check allowed files
    // TODO: inline files
    // TODO: minimize CSS
    // TODO: add meta tag "ad.size"
    // TODO: add required tags and attributes
    // TODO: check external links
    // TODO: check fallback
}

module.exports = build;
