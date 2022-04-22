const fs = require("fs-extra");
const Readable = require("stream").Readable;
const getStringFromStream = require("get-stream");
const { Base64Encode } = require("base64-stream");
const dcp = require("duplex-child-process");
const gzip = require("gzip-size");

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

async function fileSize(filename, zip = false){
	if (zip === false){
		return (await fs.stat(filename)).size;
	} else {
		return (await gzip.file(filename));
	}
}

async function copySmallestFile(path1, path2, resultPath, zip = true) {
	const size1 = await fileSize(path1, zip);
	const size2 = await fileSize(path2, zip);
	if (size1 >= size2) {
		if (resultPath !== path2) await fs.copy(path2, resultPath);
	}
	else {
		if (resultPath !== path1) await fs.copy(path1, resultPath);
	}
}

module.exports = {
    bufferToStream,
    stringToStream,
    streamToFile,
    streamToBase64,
    spawnAsStream,
    fileSize,
    copySmallestFile
};
