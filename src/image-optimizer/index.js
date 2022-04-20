const fs = require("fs-extra");  
const path = require("path");
const unixify = require("unixify");
const glob = require("glob-promise");

function requireUncached(module) {
    delete require.cache[require.resolve(module)];
    return require(module);
}

const imagesPath = path.resolve("./Images");
const imagesConfigPath = path.resolve("./.data/tuner.config.json");
const imagesOutputPath = path.resolve("./HTML/assets");

const imageDefaultOptions = {
    quality: 100,
    scale: 1,
    original: {
        weight: 0,
        hash: ""
    },
    compressed: {
        weight: 0,
        unzipped: 0
    },
    ultimated: true,
    options: {
        outputFormat: "",
        compress: {
            paletteDithering: "wuquant",
            imageDithering: "atkinson",
            lossless: false,
            grayscale: false,
            progressive: false,
            pretty: false,
            inline: false
        },
        outputWidth: 0,
        outputHeight: 0
    }
};

async function init() {
    if (!(await fs.pathExists(imagesConfigPath))){
        await fs.writeJSON(imagesConfigPath, {
            images: {},
            ultimate: true
        });
    }
}

async function update() {
    //
}

async function imagesList(req = {}) {
    const pattern = `${unixify(imagesPath)}/**/*.{png,jpg,jpeg,svg}`;
    const files = await glob.promise(pattern);
    let images = [];
    for (const imagePath of files) {
        const imageFilename = path.basename(imagePath);
        images.push(imageFilename);
    }

    return {
        ok: true,
        message: "",
        data: { images: images }
    };
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
    update,
    imagesList,
    imagesConfig,
    optimizeImages
};
