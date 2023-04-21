const fs = require("fs-extra");
const path = require("path");
const mime = require("mime");

async function processAssets(root, filename, document, tr) {

    const images = Array.prototype.slice.call(document.getElementsByTagName("img"));
    for (const image of images) {
        image.alt = "";
        if (image.hasAttribute("src") === false) continue;

        const imageFilename = image.getAttribute("src");
        const baseFilename = path.basename(imageFilename);
        const imageInputPath = path.resolve(root, `./HTML/${imageFilename}`);
        const imageOutputPath = path.resolve(root, `./build/${baseFilename}`);
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

    const videos = Array.prototype.slice.call(document.getElementsByTagName("video"));
    for (const video of videos) {
        if (video.hasAttribute("poster") === false) continue;

        const posterFilename = video.getAttribute("poster");
        const baseFilename = path.basename(posterFilename);
        const posterInputPath = path.resolve(root, `./HTML/${posterFilename}`);
        const posterOutputPath = path.resolve(root, `./build/${baseFilename}`);

        if (await fs.pathExists(posterInputPath)) {
            video.setAttribute("poster", baseFilename);
            await fs.copyFile(posterInputPath, posterOutputPath);
        }
    }

    const sources = Array.prototype.slice.call(document.getElementsByTagName("source"));
    for (const source of sources) {
        if (source.hasAttribute("src") === false) continue;

        const sourceFilename = source.getAttribute("src");
        const baseFilename = path.basename(sourceFilename);
        const sourceInputPath = path.resolve(root, `./HTML/${sourceFilename}`);
        const sourceOutputPath = path.resolve(root, `./build/${baseFilename}`);

        if (await fs.pathExists(sourceInputPath)) {
            source.setAttribute("src", baseFilename);
            await fs.copyFile(sourceInputPath, sourceOutputPath);
        }
    }

    const svgImages = Array.prototype.slice.call(document.getElementsByTagName("image"));
    for (const image of svgImages) {
        const isInlineImage = image.hasAttribute("inline");
        if (image.hasAttribute("href") === true) {
            const imageFilename = image.getAttribute("href");
            const baseFilename = path.basename(imageFilename);
            const imageInputPath = path.resolve(root, `./HTML/${imageFilename}`);
            const imageOutputPath = path.resolve(root, `./build/${baseFilename}`);
            
            if (await fs.pathExists(imageInputPath)) {
                if (isInlineImage || tr.inlineFiles) {
                    const content = await fs.readFile(imageInputPath);
                    const base64Str = content.toString("base64");
                    const mimetype = mime.getType(imageInputPath);
                    const dataStr = `data:${mimetype};base64,${base64Str}`;
                    image.removeAttribute("inline");
                    image.removeAttribute("href");
                    image.setAttribute("href", dataStr);
                }
                else {
                    image.setAttribute("href", baseFilename);
                    await fs.copyFile(imageInputPath, imageOutputPath);
                }
            }
        }
        if (image.hasAttribute("xlink:href") === true) {
            const imageFilename = image.getAttribute("xlink:href");
            const baseFilename = path.basename(imageFilename);
            const imageInputPath = path.resolve(root, `./HTML/${imageFilename}`);
            const imageOutputPath = path.resolve(root, `./build/${baseFilename}`);

            if (await fs.pathExists(imageInputPath)) {
                if (isInlineImage || tr.inlineFiles) {
                    const content = await fs.readFile(imageInputPath);
                    const base64Str = content.toString("base64");
                    const mimetype = mime.getType(imageInputPath);
                    const dataStr = `data:${mimetype};base64,${base64Str}`;
                    image.removeAttribute("inline");
                    image.removeAttribute("xlink:href");
                    image.setAttribute("xlink:href", dataStr);
                }
                else {
                    image.setAttribute("xlink:href", baseFilename);
                    await fs.copyFile(imageInputPath, imageOutputPath);
                }
            }
        }
    }

    return true;
}

module.exports = processAssets;
