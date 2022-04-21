const mozjpeg = require("mozjpeg-binaries");
const dcp = require("duplex-child-process");

function spawnAsStream(filename, args) {
	return dcp.spawn(filename, args);
}

async function compress(inputStream, options) {
    const compressOpts = options.options.compress;
	// MozJPEG compressor stream
	const mjpegArgs = [];
	if (options.quality) mjpegArgs.push("-quality", options.quality);
	if (compressOpts.grayscale) mjpegArgs.push("-grayscale");
	if (compressOpts.progressive) mjpegArgs.push("-progressive");
	else mjpegArgs.push("-baseline");
	const jpegStream = inputStream.pipe(spawnAsStream(mozjpeg.cjpeg, mjpegArgs));
    return jpegStream;
}

module.exports = compress;
