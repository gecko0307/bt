const fs = require("fs-extra");
const path = require("path");
const greensock = require("./greensock");

const cwd = process.cwd();

async function capture() {
    const captureDir = path.join(cwd, "capture");
    if (!fs.existsSync(captureDir)){
        fs.mkdirSync(captureDir);
    }

    return await greensock.capture({
        outPath: captureDir
    });
}

module.exports = capture;
