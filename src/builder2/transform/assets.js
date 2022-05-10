const fs = require("fs-extra");
const path = require("path");
const mime = require("mime");

async function processAssets(filename, document, tr) {
    const images = Array.prototype.slice.call(document.getElementsByTagName("img"));

    for (const image of images) {
        image.alt = "";
        const imageFilename = image.getAttribute("src");
        const baseFilename = path.basename(imageFilename);
        const imageInputPath = path.resolve(`./HTML/${imageFilename}`);
        const imageOutputPath = path.resolve(`./build/${baseFilename}`);
        const isInlineImage = image.hasAttribute("inline");

        if (await fs.pathExists(imageInputPath)) {
            if (isInlineImage || tr.inlineFiles) {
                const content = await fs.readFile(imageInputPath);
                const base64Str = content.toString("base64");
                const mimetype = mime.getType(imageInputPath);
                const dataStr = `data:${mimetype};base64,${base64Str}`;
                image.removeAttribute("inline");
                image.removeAttribute("src");
                image.src = dataStr;
            }
            else {
                image.src = baseFilename;
                await fs.copyFile(imageInputPath, imageOutputPath);
            }
        }
    }
    return true;
}

module.exports = processAssets;
