const fs = require("fs-extra");  
const path = require("path");
const childProcess = require("child_process");

// TODO: async
function generate(fontsPath, fontFile, options) {
    const fontPath = path.join(fontsPath, fontFile);

    const defaultWhitelist = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890.,:;!?-+*/=><@#�$%^&()[]{}|";
    const whitelist = options.text || defaultWhitelist;

    function strToHex(str) {
        let result = "";
        for (let i = 0; i < str.length; i++) {
            result += "U+" + str.charCodeAt(i).toString(16) + ",";
        }
        return result;
    }

    const command = `glyphhanger --whitelist=${strToHex(whitelist)} --formats=woff --subset=${fontPath}`;
    console.log(command);

    childProcess.execSync(command, function(err, stdout, stderr) {
        if (err) {
            return console.log(err);
        }
    });
    
    const fontName = path.parse(fontPath).name;

    const woffFile = path.join(fontsPath, `${fontName}-subset.woff`);
    const woffData = fs.readFileSync(woffFile);
    const woffDataBase64 = woffData.toString("base64");

    const css = `@font-face {
    font-family: "${options.fontname}";
    font-weight: normal;
    font-style: normal;
    src: url(data:font/woff;charset=utf-8;base64,${woffDataBase64}) format("woff");
}
`;
    
    return css;
}

module.exports = {
    generate
};
