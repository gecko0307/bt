const fs = require("fs-extra");
const path = require("path");
const Font = require("fonteditor-core").Font;

function fixSpace(font) {
    const result = font.find({
        unicode: [32]
    });

    delete result[0].xMin;
    delete result[0].yMin;
    delete result[0].xMax;
    delete result[0].yMax;
    delete result[0].instructions;

    result[0].contours = [];
}

async function generate(fontsPath, fontFile, options) {
    const fontPath = path.join(fontsPath, fontFile);
    const fontType = path.extname(fontPath).substring(1);

    const text = options.text;
    const uniqueChars = text.split("").filter((value, index, self) => self.indexOf(value) === index).sort().join("");

    const subset = uniqueChars.split("").map(x => x.charCodeAt(0));
    subset.push(10);
    subset.push(13);
    subset.push(32);

    const srcFont = await fs.readFile(fontPath);

    const font = Font.create(srcFont, {
        type: fontType,
        subset: subset,
        hinting: true,
        compound2simple: false,
        inflate: null,
        combinePath: false,
    });

    if (fontType === "ttf" && subset.includes(32))
        fixSpace(font);
    
    const fontObj = font.get();

    fontObj["OS/2"].version = 3;
    fontObj["hhea"].ascent = fontObj["OS/2"].sTypoAscender = fontObj["OS/2"].usWinAscent;
    fontObj["hhea"].descent = fontObj["OS/2"].sTypoDescender = fontObj["OS/2"].usWinDescent * -1;
    fontObj["hhea"].lineGap = fontObj["OS/2"].sTypoLineGap = 0;

    fontObj.name["description"] = "";
    fontObj.name["copyright"] = "";
    fontObj.name["tradeMark"] = "";
    fontObj.name["urlOfFontVendor"] = "";
    fontObj.name["licence"] = "";
    fontObj.name["urlOfLicence"] = "";

    return font;
}

module.exports = {
    generate
};
