const svg2png = require("./svg2png");
const webp = require("./webp");

async function convert(inputStream, options) {
	const lossless = options.options.compress.lossless;
	options.options.compress.lossless = true;
	const pngStream = await svg2png(inputStream, options);
	options.options.compress.lossless = lossless;
	return webp(pngStream, options);
}

module.exports = convert;
