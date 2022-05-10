const fs = require("fs-extra");
const path = require("path");
const minify = require("@node-minify/core");
const uglifyjs = require("@node-minify/uglify-js");

async function processScripts(filename, document, tr) {
    const scripts = Array.prototype.slice.call(document.getElementsByTagName("script"));

    for (const script of scripts) {
        const scriptFilename = script.getAttribute("src");
        console.log(scriptFilename);
        const scriptInputPath = path.resolve(`./HTML/${scriptFilename}`);
        const isInlineScript = script.hasAttribute("inline");

        if (await fs.pathExists(scriptInputPath)) {
            const baseFilename = path.basename(scriptFilename);
            let code = await fs.readFile(scriptInputPath, "utf8");

            if (scriptFilename === "animation.js") {
                code = await minify({ compressor: uglifyjs, content: code });
            }

            // TODO: remove GSDevTools when preparing for TR

            if (isInlineScript) { // || tr.inlineAll
                script.removeAttribute("inline");
                script.removeAttribute("src");
                script.type = "text/javascript";
                script.innerHTML = "\n" + code;
            }
            else {
                const scriptOutputPath = path.resolve(`./build/${baseFilename}`);
                script.src = baseFilename;
                await fs.outputFile(scriptOutputPath, code);
            }
        }
    }

    return true;
}

module.exports = processScripts;
