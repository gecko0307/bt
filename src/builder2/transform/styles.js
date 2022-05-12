const fs = require("fs-extra");
const path = require("path");
const stripComments = require("strip-comments");
const minify = require("@node-minify/core");
const cleanCSS = require("@node-minify/clean-css");
const replaceUrl = require("replace-css-url");

async function processStyles(filename, document, tr) {
    let assets = [];

    async function processCode(code) {
        let result = code;

        if ("ids" in tr) {
            for (const id of Object.keys(tr.ids)) {
                const newId = tr.ids[id];
                const re = new RegExp(`#${id}`, "g");
                result = result.replace(re, `#${newId}`);
            }
        }

        result = replaceUrl(result,
            function(p) {
                const assetPath = path.resolve(`./HTML/${p}`);
                if (fs.pathExistsSync(assetPath)) {
                    if (!assets.includes(p)) assets.push(p);
                    return path.basename(p);
                }
                else {
                    return p;
                }
            });
        
        result = stripComments(result, { language: "css" });

        if (tr.minify === true)
            result = await minify({ compressor: cleanCSS, content: result });
        
        return result;
    }
    
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
            const code = await processCode(style.innerHTML);
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
            code = await processCode(code);
            
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

    //console.log(assets);
    // TODO: make this separate stage
    for (const asset of assets) {
        const filename = path.basename(asset);
        const assetInputPath = path.resolve(`./HTML/${asset}`);
        const assetOutputPath = path.resolve(`./build/${filename}`);
        await fs.copyFile(assetInputPath, assetOutputPath);
    }

    return true;
}

module.exports = processStyles;
