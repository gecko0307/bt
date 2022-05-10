const fs = require("fs-extra");
const path = require("path");
const minify = require("@node-minify/core");
const cleanCSS = require("@node-minify/clean-css");

async function processStyles(filename, document, tr) {
    // TODO: process inline styles

    const extStyles = Array.prototype.slice.call(document.getElementsByTagName("link"));
    for (const style of extStyles) {
        const styleFilename = style.getAttribute("href");
        const styleInputPath = path.resolve(`./HTML/${styleFilename}`);
        const isInlineStyle = style.hasAttribute("inline");

        if (await fs.pathExists(styleInputPath)) {
            const baseFilename = path.basename(styleFilename);
            let code = await fs.readFile(styleInputPath, "utf8");
            // TODO: process urls in code
            code = await minify({ compressor: cleanCSS, content: code });

            // TODO: remove GSDevTools style when preparing for TR

            if (isInlineStyle) { // || tr.inlineAll
                const inlineStyle = document.createElement("style");
                inlineStyle.type = "text/css";
                inlineStyle.innerHTML = code;
                style.replaceWith(inlineStyle);
            }
            else {
                const styleOutputPath = path.resolve(`./build/${baseFilename}`);
                style.href = baseFilename;
                await fs.outputFile(styleOutputPath, code);
            }
        }
    }

    return true;
}

module.exports = processStyles;
