const fs = require("fs-extra");
const path = require("path");
const decodePNG = require("./png-decoder");
const imageq = require("image-q");
const PngQuant = require("pngquant");
const util = require("util");
const execFile = util.promisify(require("child_process").execFile);
const { nanoid } = require("nanoid");

async function compress(inputStream, options) {
	const compressOpts = options.options.compress;
	let outStream = inputStream;
	
	if (!compressOpts.lossless) {
		const colors = Math.floor(options.quality / 100 * 256);
		const pngQuanter = new PngQuant([colors, "--strip"]);

		// Decode PNG from stream
		const png = await decodePNG(inputStream);

		// Create image-q image
		const inPointContainer = imageq.utils.PointContainer.fromUint8Array(
			png.data, png.width, png.height
		);

		// Create image-q palette
		const palette = await imageq.buildPalette([inPointContainer], {
			colorDistanceFormula: "manhattan",
			paletteQuantization: compressOpts.paletteDithering || "wuquant",
			colors: colors
		});

		// Dithering
		const outPointContainer = await imageq.applyPalette(inPointContainer, palette, {
			colorDistanceFormula: "manhattan",
			imageQuantization: compressOpts.imageDithering || "atkinson"
		});

		// Write data back to PNG image and create output stream
		png.data = outPointContainer.toUint8Array();
		outStream = png.pack().pipe(pngQuanter);
	}

	// TODO: extra lossless compression

	return outStream;
}

module.exports = compress;