const Readable = require("stream").Readable;
const getStringFromStream = require("get-stream");
const svg2png = require("svg2png");
const svgCompressor = require("./svg");
const pngCompressor = require("./png");

function bufferToStream(buffer) {
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    return stream;
}

async function convert(inputStream, options) {
    const svg2pngOptions = {};
    
    if (options.options.outputWidth > 0)
        svg2pngOptions.width = options.options.outputWidth;
    if (options.options.outputHeight > 0)
        svg2pngOptions.height = options.options.outputHeight;
    
    const svgStream = await svgCompressor(inputStream, options);
    const svgData = await getStringFromStream(svgStream);
    const png = await svg2png(svgData, svg2pngOptions);
    const pngStream = bufferToStream(png);
    return pngCompressor(pngStream, options);
}

module.exports = convert;
