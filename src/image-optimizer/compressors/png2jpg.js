const jpegjs = require("jpeg-js");
const pngjs = require("pngjs");
const decodePNG = require("./png-decoder");
const jpg = require("./jpg");
const { bufferToStream } = require("../utils");

function hexToRgb(hex) {
	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result? [
		parseInt(result[1], 16) / 255,
		parseInt(result[2], 16) / 255,
		parseInt(result[3], 16) / 255
	] : [0, 0, 0];
}

async function convert(inputStream, options) {
	const compressOpts = options.options.compress;
	const src = await decodePNG(inputStream);

	const bg = hexToRgb(compressOpts.backgroundColor || "#ffffff");

	// Create new image
	const pngImage = new pngjs.PNG({
		width: src.width,
		height: src.height,
		colorType: 2
	});

	function blend(c1, c2, alpha) {
		return c1 * (1.0 - alpha) + c2 * alpha;
	}

	// Blend color data from pngSrc with background color
	for (let y = 0; y < src.height; y++) {
		for (let x = 0; x < src.width; x++) {
			var i = (src.width * y + x) * 4;
			
			const r = src.data[i] / 255;
			const g = src.data[i + 1] / 255;
			const b = src.data[i + 2] / 255;
			const a = src.data[i + 3] / 255;
			
			pngImage.data[i] = Math.floor(blend(bg[0], r, a) * 255);
			pngImage.data[i + 1] = Math.floor(blend(bg[1], g, a) * 255);
			pngImage.data[i + 2] = Math.floor(blend(bg[2], b, a) * 255);
			pngImage.data[i + 3] = 255;
		}
	}

	const jpegStream = await bufferToStream(jpegjs.encode(pngImage, 100).data);
	return jpg(jpegStream, options);
}

module.exports = convert;
