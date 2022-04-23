const fs = require("fs-extra");  
const path = require("path");
const unixify = require("unixify");
const glob = require("glob-promise");
const mime = require("mime");
const { fillMissing } = require("object-fill-missing-keys");
const { fileSize, fileHash, streamToFile, copySmallestFile } = require("./utils");

function requireUncached(module) {
    delete require.cache[require.resolve(module)];
    return require(module);
}

const imagesPath = path.resolve("./Images");
const imagesConfigPath = path.resolve("./.data/tuner.config.json");
const imagesOutputPath = path.resolve("./HTML/assets");
const inlineImagesPath = path.resolve("./HTML/inline_images.css");

const imageDefaultOptions = {
    quality: 100,
    scale: 1,
    original: {
        weight: 0,
        hash: ""
    },
    compressed: {
        weight: 0,
        unzipped: 0,
        hash: ""
    },
    options: {
        outputFormat: "",
        compress: {
            paletteDithering: "wuquant",
            imageDithering: "atkinson",
            lossless: false,
            grayscale: false,
            progressive: false,
            pretty: false,
            inline: false,
            selector: "",
            backgroundColor: "#ffffff"
        },
        outputWidth: 0,
        outputHeight: 0
    },
    ultimated: true,
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
        const conf = config[imageFile] || {};
        const result = fillMissing(conf, imageDefaultOptions);

        const inputFormat = path.extname(imageFile).substring(1).toLowerCase();
        if (result.options.outputFormat.length === 0)
            result.options.outputFormat = inputFormat;
        
        config[imageFile] = result;
    }

    await fs.writeJSON(imagesConfigPath, config, { spaces: "\t" });

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

    if (options.outputFormat === options.inputFormat)
        await copySmallestFile(options.inputPath, options.outputPath, options.outputPath);
}

function chunkArray(myArray, chunk_size){
	const arr = [...myArray];
	const results = [];
	while (arr.length) {
		results.push(arr.splice(0, chunk_size));
	}
	return results;
}

async function optimizeImages(req) {
    console.log("Image Optimizer is running...");
    
    const config = req.config;
    const images = await inputImages();

    if (!(await fs.pathExists(imagesOutputPath))){
        await fs.mkdir(imagesOutputPath);
    }

    const compressOptionsArr = [];

    for (const imageFile of images) {
        console.log(imageFile);
        const conf = config[imageFile];
        const imageOptions = conf || { ...imageDefaultOptions };
        const inputFormat = path.extname(imageFile).substring(1).toLowerCase();
        const outputFormat = conf.options.outputFormat;
        if (outputFormat.length === 0) conf.options.outputFormat = inputFormat;
        const inputPath = path.join(imagesPath, imageFile);
        const outputPath = path.join(imagesOutputPath, imageFile.split(".")[0] + "." + outputFormat);
        // TODO: don't compress if input didn't change
        if (await fs.pathExists(inputPath)) {
            conf.original = {
                weight: await fileSize(inputPath, false),
                hash: await fileHash(inputPath)
            };

            const compressor = imageCompressorFunction(inputFormat, outputFormat);
            compressOptionsArr.push({
                inputPath: inputPath,
                outputPath: outputPath,
                inputFormat: inputFormat,
                outputFormat: outputFormat,
                imageOptions: imageOptions,
                compressor: compressor
            });
        }
        else {
            const errorMsg = `No such file: ${inputPath}`
            console.log(errorMsg);
            return {
                ok: false,
                message: errorMsg
            }
        }
    }

    try {
        const chunkSize = 10;
        if (compressOptionsArr.length < chunkSize) {
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
        return {
            ok: false,
            message: e.message
        }
    }

    // Write output metadata
    for (const imageFile of images) {
        const conf = config[imageFile];
        const outputFormat = conf.options.outputFormat;
        const outputPath = path.join(imagesOutputPath, imageFile.split(".")[0] + "." + outputFormat);
        if (await fs.pathExists(outputPath)) {
            conf.compressed = {
                weight: await fileSize(outputPath, true),
                unzipped: await fileSize(outputPath, false),
                hash: await fileHash(outputPath)
            };
        }
        else {
            conf.compressed = {
                weight: 0,
                unzipped: 0,
                hash: ""
            };
        }
    }

    // Generate inline images
    let inlineImages = "";
    for (const compressEntry of compressOptionsArr) {
        const imageOptions = compressEntry.imageOptions;
        const inline = imageOptions.options.compress.inline || false;
        if (inline) {
            const imagePath = compressEntry.outputPath;
            const content = await fs.readFile(imagePath);
            const base64Str = content.toString("base64");
            const mimetype = mime.getType(imagePath);
            const dataStr = `data:${mimetype};base64,${base64Str}`;
            const name = path.parse(imagePath).name;
            const defaultSelector = `.${name}`;
            let cssSelector = defaultSelector;
            const configSelector = imageOptions.options.compress.selector;
            if (configSelector) {
                if (configSelector.length > 0) cssSelector = configSelector;
            }
            console.log(`Base64 encode file ${imagePath} as ${cssSelector}`);
            const cssRule = `${cssSelector} { background-image: url("${dataStr}"); }`;
            inlineImages += cssRule + "\n\n";
        }
    }
    console.log("Write", inlineImagesPath);
    await fs.writeFile(inlineImagesPath, inlineImages);

    await fs.writeJSON(imagesConfigPath, config, { spaces: "\t" });
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
