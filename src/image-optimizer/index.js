const fs = require("fs-extra");  
const path = require("path");
const unixify = require("unixify");
const glob = require("glob-promise");
const { streamToFile } = require("./utils");

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

async function inputImages() {
    const pattern = `${unixify(imagesPath)}/**/*.{png,jpg,svg}`;
    const files = await glob.promise(pattern);
    let images = [];
    for (const imagePath of files) {
        const imageFilename = path.basename(imagePath);
        images.push(imageFilename);
    }
    return images;
}

async function imagesList(req = {}) {
    return {
        ok: true,
        message: "",
        data: { images: await inputImages() }
    };
}

async function imagesConfig(req = {}) {
    let config = {};
    if (await fs.pathExists(imagesConfigPath)) {
        config = requireUncached(imagesConfigPath) || {};
    }
    
    const images = await inputImages();
    for (const imageFile of images) {
        if (!(imageFile in config)) {
            const inputFormat = path.extname(imageFile).substring(1).toLowerCase();
            config[imageFile] = {
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
                    outputFormat: inputFormat,
                    compress: {
                        paletteDithering: "wuquant",
                        imageDithering: "atkinson",
                        lossless: false,
                        grayscale: false,
                        progressive: false,
                        pretty: false,
                        inline: false,
                        backgroundColor: "#ffffff"
                    },
                    outputWidth: 0,
                    outputHeight: 0
                }
            };
        }
    }

    await fs.writeJSON(imagesConfigPath, config);

    return {
        ok: true,
        message: "",
        data: {
            config: config
        }
    };
}

const imageCompressors = {
    "png": require("./compressors/png"),
    "jpg": require("./compressors/jpg"),
    "webp": require("./compressors/webp"),
    "svg": require("./compressors/svg")
};

const converters = {
	"png": {
		"png": imageCompressors["png"], // png -> png
		"jpg": require("./compressors/png2jpg"), // png -> jpg
		"svg": require("./compressors/png2svg"), // png -> svg
		"webp": imageCompressors["webp"] // png -> webp
	},

	"jpg": {
		"jpg": imageCompressors["jpg"], // jpg -> jpg
		"webp": imageCompressors["webp"] // jpg -> webp
	},

	"svg": {
		"svg": imageCompressors["svg"], // svg -> svg
		"png": require("./compressors/svg2png"), // svg -> png
		"jpg": require("./compressors/svg2jpg"), // svg -> jpg
		"webp": require("./compressors/svg2webp") // svg -> webp
	},

	"webp": {
		"webp": imageCompressors["webp"] // webp -> webp
	}
};

async function fallbackCompressor(inputStream, options) {
    return inputStream;
}

function imageCompressorFunction(inputFormat, outputFormat) {
    if (inputFormat in converters) {
        const inpConverter = converters[inputFormat];
        if (outputFormat in inpConverter) {
            return inpConverter[outputFormat];
        }
        else return fallbackCompressor;
    }
    else return fallbackCompressor;
}

async function compress(options) {
    const inputStream = fs.createReadStream(options.inputPath);
    const outputStream = await options.compressor(inputStream, options.imageOptions);
    await streamToFile(outputStream, options.outputPath);
    console.log(`Saved to ${options.outputPath}`);
    // TODO: keep smallest file
}

async function optimizeImages(req) {
    console.log("Image Optimizer is running...");
    
    const config = req.config;
    const images = await inputImages();

    if (!(await fs.pathExists(imagesOutputPath))){
        await fs.mkdir(imagesOutputPath);
    }

    // TODO: add promises to array, then run in chunks
    const compressOptionsArr = [];

    for (const imageFile of images) {
        console.log(imageFile);
        const imageOptions = config[imageFile] || { ...imageDefaultOptions };
        const inputFormat = path.extname(imageFile).substring(1).toLowerCase();
        const outputFormat = config[imageFile].options.outputFormat;
        console.log(`${inputFormat} -> ${outputFormat}`);
        const inputPath = path.join(imagesPath, imageFile);
        const outputPath = path.join(imagesOutputPath, imageFile.split(".")[0] + "." + outputFormat);
        if (await fs.pathExists(inputPath)) {
            const compressor = imageCompressorFunction(inputFormat, outputFormat);
            compressOptionsArr.push({
                inputPath: inputPath,
                outputPath: outputPath,
                imageOptions: imageOptions,
                compressor: compressor
            });
        }
        else {
            // TODO: error
        }
    }

    try {
		const chunkSize = 10;
		if (compressOptionsArr.length < chunkSize){
			await Promise.all(compressOptionsArr.map(opts => compress(opts)));
		}
		else {
			const chunks = chunkArray(compressOptionsArr, chunkSize);
			for (const chunk of chunks) {
				await Promise.all(chunk.map(opts => compress(opts)));
			}
		}
	}
    catch(e) {
		console.log(e.message);
	}
    
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
