const fs = require("fs-extra");
const path = require("path");

async function check(tr) {
    console.log("Check...");

    let res = true;
    for (filename of tr.requiredFiles) {
        const requiredFiePath = path.resolve(`./HTML/${filename}`);
        res = res && await fs.pathExists(requiredFiePath);
        if (res === false) {
            console.log(`Error: required file "${filename}" is missing`);
        }
    }

    return res;
}

module.exports = check;
