const fs = require("fs-extra");  
const path = require("path");
const { exec, spawn } = require("promisify-child-process");

function strToHex(str) {
    let result = "";
    for (let i = 0; i < str.length; i++) {
        result += "U+" + str.charCodeAt(i).toString(16);
        if (i < str.length - 1) result += ",";
    }
    return result;
}

// FIXME: glyphhanger doesn't run in Node.js!
async function generate(fontsPath, fontFile, options) {
    const fontPath = path.join(fontsPath, fontFile);

    const defaultWhitelist = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890.,:;!?-+*/=><@#�$%^&()[]{}|";
    const whitelist = options.text || defaultWhitelist;

    const command = `glyphhanger --whitelist=${strToHex(whitelist)} --formats=woff --subset=${fontPath}`;
    console.log(command);

    const { stdout, stderr } = await exec(command);
    
    const fontName = path.parse(fontPath).name;

    const woffFile = path.join(fontsPath, `${fontName}-subset.woff`);
    const woffData = await fs.readFile(woffFile, "binary");
    const woffDataBase64 = woffData.toString("base64");
    
    return `data:font/woff;charset=utf-8;base64,${woffDataBase64}`;
}

module.exports = {
    generate
};
