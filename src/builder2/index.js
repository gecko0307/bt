const fs = require("fs-extra");
const path = require("path");
const stt = require("spaces-to-tabs");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const pretty = require("pretty");
const babel = require("@babel/core");
const minify = require("@node-minify/core");
const uglifyjs = require("@node-minify/uglify-js");
const cleanCSS = require("@node-minify/clean-css");
const mime = require("mime");
const Zip = require("adm-zip");

const platformProcessors = {
    dcm: require("./dcm")
};

async function build(inputDir, outputDir, platform, zipName = "") {
    const modulesDir = path.join(__dirname, "..", "node_modules");
    
    const input = {
        index: path.join(inputDir, "index.html"),
        bundle: path.join(inputDir, "bundle.js"),
    };
    
    const output = {
        index: path.join(outputDir, "index.html"),
        css: path.join(outputDir, "main.css"),
        bundle: path.join(outputDir, "bundle.js"),
        anime: path.join(outputDir, "anime.min.js"),
        zip: path.join(outputDir, "..", zipName),
    };
    
    const outputFiles = [];
    
    const babelOptions = {
        presets: [path.join(modulesDir, "@babel", "preset-env")]
    };
    
    const inlineAll = false;
    
    fs.emptyDirSync(outputDir);
    
    // HTML
    const index = await fs.readFile(input.index, "utf8");
    const dom = new JSDOM(stt(index, 2));
    const head = dom.window.document.getElementsByTagName("head")[0];
    const body = dom.window.document.getElementsByTagName("body")[0];
    const link = dom.window.document.getElementById("link");
    
    // JS
    const scripts = Array.prototype.slice.call(dom.window.document.getElementsByTagName("script"));
    for (let i = 0; i < scripts.length; i++)
    {
        const script = scripts[i];
        const scriptFilename = script.getAttribute("src");
        const baseFilename = path.basename(scriptFilename);
        const isInlineScript = script.hasAttribute("inline");
        const inFilename = path.join(inputDir, scriptFilename);
        const outFilename = path.join(outputDir, baseFilename);
        if (await fs.exists(inFilename)) {
            let code = await fs.readFile(inFilename, "utf8");
            
            if (scriptFilename === "bundle.js") {
                const result = await babel.transform(code, babelOptions);
                code = await minify({ compressor: uglifyjs, content: result.code });
            }
            
            if (isInlineScript || inlineAll) {
                script.removeAttribute("inline");
                script.removeAttribute("src");
                script.type = "text/javascript";
                script.innerHTML = "\n" + code;
            }
            else {
                script.src = baseFilename;
                await fs.outputFile(outFilename, code);
                outputFiles.push(outFilename);
            }
        }
    }
    
    // Styles
    const styles = Array.prototype.slice.call(dom.window.document.getElementsByTagName("link"));
    for (const style of styles) {
        const styleFilename = style.getAttribute("href");
        const baseFilename = path.basename(styleFilename);
        const isInlineStyle = style.hasAttribute("inline");
        const inFilename = path.join(inputDir, styleFilename);
        const outFilename = path.join(outputDir, baseFilename);
        if (await fs.exists(inFilename)) {
            let code = await fs.readFile(inFilename, "utf8");
            
            // TODO: process urls in code
            
            if (isInlineStyle || inlineAll) {
                style.remove();
                const inlineStyle = dom.window.document.createElement("style");
                inlineStyle.type = "text/css";
                code = await minify({ compressor: cleanCSS, content: code });
                inlineStyle.innerHTML = code;
                head.appendChild(inlineStyle);
            }
            else {
                style.href = baseFilename;
                await fs.outputFile(outFilename, code);
                outputFiles.push(outFilename);
            }
        }
    }
    
    // Images
    const images = Array.prototype.slice.call(dom.window.document.getElementsByTagName("img"));
    for (let i = 0; i < images.length; i++) {
        const image = images[i];
        image.alt = "";
        const imageFilename = image.getAttribute("src");
        const baseFilename = path.basename(imageFilename);
        const isInlineImage = image.hasAttribute("inline");
        const inFilename = path.join(inputDir, imageFilename);
        const outFilename = path.join(outputDir, baseFilename);
        if (await fs.exists(inFilename)) {
            if (isInlineImage || inlineAll) {
                const content = await fs.readFile(inFilename);
                const base64Str = content.toString("base64");
                const mimetype = mime.getType(inFilename);
                const dataStr = `data:${mimetype};base64,${base64Str}`;
                image.removeAttribute("inline");
                image.removeAttribute("src");
                image.src = dataStr;
            }
            else {
                image.src = baseFilename;
                await fs.copy(inFilename, outFilename);
                outputFiles.push(outFilename);
            }
        }
    }
    
    // Prepare
    if (platform in platformProcessors) {
        platformProcessors[platform](dom.window.document);
    }
    else {
        console.log("Unknown platform:", platform);
    }
    
    await fs.outputFile(output.index, dom.serialize());
    outputFiles.push(output.index);
    
    // Make zip
    if (zipName.length > 0) {
        const zip = new Zip();
        for (const filename of outputFiles) {
            console.log("Zipping", filename);
            zip.addLocalFile(filename);
        }
        zip.writeZip(output.zip);
    }
}

module.exports = build;