const fs = require("fs-extra");
const Readable = require("stream").Readable;
const getStringFromStream = require("get-stream");
const { Base64Encode } = require("base64-stream");
const dcp = require("duplex-child-process");

function bufferToStream(buffer) {
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    return stream;
}

function stringToStream(str) {
    const stream = new Readable();
    stream._read = () => {};
    stream.push(str);
    stream.push(null);
    return stream;
}

function streamToFile(stream, outputPath) {
    return new Promise((resolve, reject) => {
        stream.pipe(fs.createWriteStream(outputPath))
        .on("finish", () => resolve("ok"))
        .on("error", err => reject(err));
    });
}

function streamToBase64(stream) {
    return getStringFromStream(stream.pipe(new Base64Encode()));
}

function spawnAsStream(filename, args) {
    return dcp.spawn(filename, args);
}

module.exports = {
    bufferToStream,
    stringToStream,
    streamToFile,
    streamToBase64,
    spawnAsStream
};
