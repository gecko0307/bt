const fs = require("fs-extra");  
const path = require("path");

function requireUncached(module) {
    delete require.cache[require.resolve(module)];
    return require(module);
}

const imagesPath = path.resolve("./Images");
const imagesConfigPath = path.resolve("./.data/tuner.config.json");
const imagesOutputPath = path.resolve("./HTML/assets");

async function init() {
    if (!(await fs.pathExists(imagesConfigPath))){
        await fs.writeJSON(imagesConfigPath, {});
    }
}

async function imagesConfig(req = {}) {
    let config = {};
    if (await fs.pathExists(imagesConfigPath)) {
        config = requireUncached(imagesConfigPath) || {};
    }

    return {
        ok: true,
        message: "",
        data: {
            config: config
        }
    };
}

async function optimizeImages(req) {
    console.log("Image Optimizer is running...");
    
    const config = req.config;
    
    await fs.writeJSON(imagesConfigPath, config);
    return {
        ok: true,
        message: ""
    }
}

module.exports = {
    init,
    imagesConfig,
    optimizeImages
};
