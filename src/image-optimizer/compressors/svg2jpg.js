const svg2png = require("./svg2png");
const png2jpg = require("./png2jpg");

async function convert(inputStream, options) {
	options.options.compress.lossless = true;
	const pngStream = await svg2png(inputStream, options);
	options.options.compress.lossless = false;
	return png2jpg(pngStream, options);
}

module.exports = convert;
