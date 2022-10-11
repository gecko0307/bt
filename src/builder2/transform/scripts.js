const fs = require("fs-extra");
const path = require("path");
const stripComments = require("strip-comments");
const minify = require("@node-minify/core");
const uglifyjs = require("@node-minify/uglify-js");

async function processScripts(root, filename, document, tr) {
    const scripts = Array.prototype.slice.call(document.getElementsByTagName("script"));

    for (const script of scripts) {
        const scriptFilename = script.getAttribute("src");
        const scriptInputPath = path.resolve(root, `./HTML/${scriptFilename}`);
        const isInlineScript = script.hasAttribute("inline");
        const isDevScript = script.hasAttribute("dev");
        const isPreviewScript = script.hasAttribute("preview");
        
        // TODO: minify inline scripts?

        if (await fs.pathExists(scriptInputPath)) {
            const baseFilename = path.basename(scriptFilename);
            let code = await fs.readFile(scriptInputPath, "utf8");
            
            if (scriptFilename === "animation.js") {
                code = stripComments(code, { language: "js" });
                if (tr.minify === true)
                    code = await minify({ compressor: uglifyjs, content: code });

                if ("ids" in tr) {
                    for (const id of Object.keys(tr.ids)) {
                        const newId = tr.ids[id];
                        const re = new RegExp(`"${id}"`, "g");
                        code = code.replace(re, `"${newId}"`);
                    }
                }
            }

            if (isDevScript) {
                script.remove();
            }
            else if (isPreviewScript && tr.id !== "publish") {
                script.remove();
            }
            else if (isInlineScript || tr.inlineFiles) {
                script.removeAttribute("inline");
                script.removeAttribute("src");
                script.type = "text/javascript";
                script.innerHTML = "\n" + code;
            }
            else {
                const scriptOutputPath = path.resolve(root, `./build/${baseFilename}`);
                script.src = baseFilename;
                await fs.outputFile(scriptOutputPath, code);
            }
        }
    }

    return true;
}

module.exports = processScripts;
