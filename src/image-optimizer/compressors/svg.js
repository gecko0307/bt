const Readable = require("stream").Readable;
const getStringFromStream = require("get-stream");
const svgo = require("svgo");

function stringToStream(str) {
    const stream = new Readable();
    stream._read = () => {};
    stream.push(str);
    stream.push(null);
    return stream;
}

const svgoPlugins = [
    "preset-default",
    { name: "removeViewBox", active: false }, // keep viewBox
    { name: "sortAttrs", active: true },
    { name: "removeAttrs", active: true, params: { attrs:["data\-.+"] }},
    { name: "viewBox", active: true, ...require("./svgo-plugins/viewBox") }, // add viewBox if missing
    { name: "dimensions", active: true, ...require("./svgo-plugins/dimensions") } // add width and height if missing
];

async function compress(inputStream, options) {
    const svgStr = await getStringFromStream(inputStream);
    const result = svgo.optimize(svgStr, {
        plugins: svgoPlugins,
        js2svg: { pretty: options.pretty, indent: "\t" },
        multipass: true,
    });
    return stringToStream(result.data);
}

module.exports = compress;
