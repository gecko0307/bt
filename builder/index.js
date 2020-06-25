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

function prepareDCM(document)
{
    const head = document.getElementsByTagName("head")[0];
    const body = document.getElementsByTagName("body")[0];
    const link = document.getElementById("link");
    
    const clickTag = document.createElement("script");
    clickTag.type = "text/javascript";
    clickTag.innerHTML = ' var clickTag = "https://google.com"; ';
    const nl = document.createTextNode("\n");
    head.appendChild(nl);
    head.appendChild(clickTag);
    link.setAttribute("href", "javascript:void(window.open(window.clickTag))");
    link.setAttribute("aria-label", "Перейти по ссылке в баннере");
}

async function build(inputDir, outputDir, zipName = "")
{
    const input =
    {
        index: path.join(inputDir, "index.html"),
        bundle: path.join(inputDir, "bundle.js"),
    };
    
    const output =
    {
        index: path.join(outputDir, "index.html"),
        css: path.join(outputDir, "main.css"),
        bundle: path.join(outputDir, "bundle.js"),
        anime: path.join(outputDir, "anime.min.js"),
        zip: path.join(outputDir, "..", zipName),
    };
    
    const outputFiles = [];
    
    async function copy(filename)
    {
        await fs.copy(
            path.join(inputDir, filename),
            path.join(outputDir, filename));
        outputFiles.push(path.join(outputDir, filename));
    }
    
    const babelOptions =
    {
        presets: ["@babel/preset-env"]
    };
    
    const inlineAll = false;
    
    // HTML
    const index = await fs.readFile(input.index, "utf8");
    const dom = new JSDOM(stt(index, 2));
    const head = dom.window.document.getElementsByTagName("head")[0];
    const body = dom.window.document.getElementsByTagName("body")[0];
    const link = dom.window.document.getElementById("link");
    
    // JS
    const scripts = dom.window.document.getElementsByTagName("script");
    for (let i = 0; i < scripts.length; i++)
    {
        const script = scripts[i];
        const scriptFilename = script.getAttribute("src");
        const isInlineScript = script.hasAttribute("inline");
        const inFilename = path.join(inputDir, scriptFilename);
        if (await fs.exists(inFilename))
        {
            let code = await fs.readFile(inFilename, "utf8");
            
            if (scriptFilename === "bundle.js")
            {
                const result = await babel.transform(code, babelOptions);
                //code = uglify.minify(result.code).code;
                code = await minify({ compressor: uglifyjs, content: result.code });
            }
            
            if (isInlineScript || inlineAll)
            {
                script.removeAttribute("inline");
                script.removeAttribute("src");
                script.type = "text/javascript";
                script.innerHTML = code;
            }
            else
            {
                const outFilename = path.join(outputDir, scriptFilename);
                await fs.outputFile(outFilename, code);
                outputFiles.push(outFilename);
            }
        }
    }
    
    // Styles
    const styles = dom.window.document.getElementsByTagName("link");
    for (let i = 0; i < styles.length; i++)
    {
        const style = styles[i];
        const styleFilename = style.getAttribute("href");
        const isInlineStyle = style.hasAttribute("inline");
        const inFilename = path.join(inputDir, styleFilename);
        if (await fs.exists(inFilename))
        {
            let code = await fs.readFile(inFilename, "utf8");
            
            if (isInlineStyle || inlineAll)
            {
                style.remove();
                const inlineStyle = dom.window.document.createElement("style");
                inlineStyle.type = "text/css";
                code = await minify({ compressor: cleanCSS, content: code });
                inlineStyle.innerHTML = code;
                head.appendChild(inlineStyle);
            }
            else
            {
                const outFilename = path.join(outputDir, styleFilename);
                await fs.outputFile(outFilename, code);
                outputFiles.push(outFilename);
            }
        }
    }
    
    // Images
    const images = dom.window.document.getElementsByTagName("img");
    for (let i = 0; i < images.length; i++)
    {
        const image = images[i];
        image.alt = "";
        const imageFilename = image.getAttribute("src");
        const isInlineImage = image.hasAttribute("inline");
        const inFilename = path.join(inputDir, imageFilename);
        const outFilename = path.join(outputDir, imageFilename);
        if (await fs.exists(inFilename))
        {
            if (isInlineImage || inlineAll)
            {
                const content = await fs.readFile(inFilename);
                const base64Str = content.toString("base64");
                const mimetype = mime.getType(inFilename);
                const dataStr = `data:${mimetype};base64,${base64Str}`;
                image.removeAttribute("inline");
                image.removeAttribute("src");
                image.src = dataStr;
            }
            else
            {
                await copy(imageFilename);
            }
        }
    }
    
    // Prepare
    // TODO: use build.json from banner source
    prepareDCM(dom.window.document);
    
    await fs.outputFile(output.index, dom.serialize());
    outputFiles.push(output.index);
    
    // Make zip
    if (zipName.length > 0) 
    {
        const zip = new Zip();
        for (const filename of outputFiles)
        {
            console.log("Zipping", filename);
            zip.addLocalFile(filename);
        }
        zip.writeZip(output.zip);
    }
}

async function main()
{
    await build("banners/300x300", "dist/300x300", "300x300_dcm.zip");
}

main();
