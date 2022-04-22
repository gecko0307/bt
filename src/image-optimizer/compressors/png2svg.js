const pngjs = require("pngjs");
const jpegjs = require("jpeg-js");
const { nanoid } = require("nanoid");
const { bufferToStream, stringToStream, streamToBase64 } = require("../utils");
const decodePNG = require("./png-decoder");
const png = require("./png");
const jpg = require("./jpg");

// Make JPEG from pngjs data
// (returns buffer, not a stream!)
function pngToJpeg(png, quality) {
	return jpegjs.encode(png, quality).data;
}

async function convert(inputStream, options) {
	const compressOpts = options.options.compress;
	
	// Decode PNG from stream
	const src = await decodePNG(inputStream);
	
	// Create color image
	const pngImage = new pngjs.PNG({
		width: src.width,
		height: src.height,
		colorType: 2
	});
	
	// Create mask
	const pngMask = new pngjs.PNG({
		width: src.width,
		height: src.height,
		colorType: 0
	});
	
	// Extract color image and mask from PNG
	for (let y = 0; y < src.height; y++) {
		for (let x = 0; x < src.width; x++) {
			var i = (src.width * y + x) * 4;
			
			const r = src.data[i];
			const g = src.data[i + 1];
			const b = src.data[i + 2];
			const a = src.data[i + 3];
			
			pngMask.data[i] = a;
			pngMask.data[i + 1] = a;
			pngMask.data[i + 2] = a;
			pngMask.data[i + 3] = 255;
			
			pngImage.data[i] = r;
			pngImage.data[i + 1] = g;
			pngImage.data[i + 2] = b;
			pngImage.data[i + 3] = 255;
		}
	}
	
	// Compress color image to JPEG and make a stream from it
	const imgStream = await jpg(bufferToStream(pngToJpeg(pngImage, 100)), {
		quality: options.quality,
		options: {
			compress: {
				progressive: compressOpts.progressive
			}
		}
	});
	
	// Get base64 string of color image stream
	const img = await streamToBase64(imgStream);
	
	const name = nanoid();
	
	// Get base64 string of mask
	const maskOptions = {
		quality: 100,
		options: {
			compress: {
				paletteDithering: compressOpts.paletteDithering,
				imageDithering: compressOpts.imageDithering,
				lossless: false
			}
		}
	};
	
	// Compress mask to PNG and make a stream from it
	const maskStream = await png(pngMask.pack(), maskOptions);
	// Get base64 string from mask stream
	const mask = await streamToBase64(maskStream);
	
	const imageBase64 = `data:image/jpeg;base64,${img}`;
	const maskBase64 = `data:image/png;base64,${mask}`;
	const imageWidth = src.width;
	const imageHeight = src.height;
	
	// Format data to SVG string and make a stream from it
	const svg = /* html */
	`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${imageWidth}" height="${imageHeight}" viewBox="0 0 ${imageWidth} ${imageHeight}"><defs><mask id="m"><image width="${imageWidth}" height="${imageHeight}" xlink:href="${maskBase64}"></image></mask></defs><image mask="url(#m)" width="${imageWidth}" height="${imageHeight}" xlink:href="${imageBase64}"></image></svg>`;
	
	return stringToStream(svg);
}

module.exports = convert;
