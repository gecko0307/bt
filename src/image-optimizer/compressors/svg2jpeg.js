const svg2png = require("./svg2png");
const png2jpg = require("./png2jpeg");

async function convert(inputStream, options) {
	const pngOptions = { ...options };
	pngOptions.options.compress.lossless = true;
	const pngStream = await svg2png(inputStream, pngOptions);
	return png2jpg(pngStream, options);
}

module.exports = convert;
