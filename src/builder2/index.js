const fs = require("fs-extra");
const path = require("path");

function requirement(id) {
    return require(`./requirements/${id}.json`);
}

const platforms = {
    "yandex": requirement("yandex"),
    "publish": requirement("publish")
    /*
        TODO - basic platforms:
        adfox
        adform
        admitad
        adrime
        adriver
        adwords
        rambler
        yandex
        bestseller
        cityads
        studio
        dca
        womensnetwork
        getintent
        mail
        mytarget
        nativeroll
        otm
        rbc
        sizmek
        soloway
        weborama
    */
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

    let platform = platforms["publish"];

    if (platformId in platforms) {
        platform = platforms[platformId];
    }
}

module.exports = build;
