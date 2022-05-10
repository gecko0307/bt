const fs = require("fs-extra");
const path = require("path");
const minify = require("@node-minify/core");
const cleanCSS = require("@node-minify/clean-css");

async function processStyles(filename, document, tr) {
    const styles = Array.prototype.slice.call(document.getElementsByTagName("style"));
    for (const style of styles) {
        const isDevStyle = style.hasAttribute("dev");
        const isPreviewStyle = style.hasAttribute("preview");
        if (isDevStyle) {
            style.remove();
        }
        else if (isPreviewStyle && tr.id !== "publish") {
            style.remove();
        }
        else {
            let code = style.innerHTML;
            code = await minify({ compressor: cleanCSS, content: code });
            style.removeAttribute("inline");
            style.innerHTML = "\n" + code;
        }
    }

    const extStyles = Array.prototype.slice.call(document.getElementsByTagName("link"));
    for (const style of extStyles) {
        const styleFilename = style.getAttribute("href");
        const styleInputPath = path.resolve(`./HTML/${styleFilename}`);
        const isInlineStyle = style.hasAttribute("inline");
        const isDevStyle = style.hasAttribute("dev");
        const isPreviewStyle = style.hasAttribute("preview");

        if (await fs.pathExists(styleInputPath)) {
            const baseFilename = path.basename(styleFilename);
            let code = await fs.readFile(styleInputPath, "utf8");
            
            // TODO: process urls in code
            code = await minify({ compressor: cleanCSS, content: code });

            if (isDevStyle) {
                style.remove();
            }
            else if (isPreviewStyle && tr.id !== "publish") {
                style.remove();
            }
            else if (isInlineStyle || tr.inlineFiles) {
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
