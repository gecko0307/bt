const fs = require("fs-extra");
const path = require("path");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const pretty = require("pretty");
const babel = require("@babel/core");
const uglify = require("uglify-js");
const Zip = require("adm-zip");

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
    
    // CSS
    await copy("main.css");
    
    // HTML
    const index = await fs.readFile(input.index, "utf8");
    const dom = new JSDOM(index);
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
                code = uglify.minify(result.code).code;
            }
            
            if (isInlineScript)
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
    
    // CSS
    /*
    const styles = dom.window.document.getElementsByTagName("link");
    for (let i = 0; i < styles.length; i++)
    {
        const style = styles[i];
        const styleFilename = style.getAttribute("href");
        const isInlineStyle = style.hasAttribute("inline");
        console.log(styleFilename, isInlineStyle);
        const inFilename = path.join(inputDir, styleFilename);
        if (await fs.exists(inFilename))
        {
            let code = await fs.readFile(inFilename, "utf8");
            
            if (isInlineStyle)
            {
                style.removeAttribute("inline");
                style.removeAttribute("href");
                style.rel = "stylesheet";
                style.type = "text/css";
                style.innerHTML = code;
            }
            else
            {
                const outFilename = path.join(outputDir, styleFilename);
                await fs.outputFile(outFilename, code);
                outputFiles.push(outFilename);
            }
        }
    }
    */
    
    // Images
    const images = dom.window.document.getElementsByTagName("img");
    for (let i = 0; i < images.length; i++)
    {
        const image = images[i];
        const imageFilename = image.getAttribute("src");
        const isInlineImage = image.hasAttribute("inline");
        //console.log(imageFilename, isInlineImage);
        const inFilename = path.join(inputDir, imageFilename);
        if (await fs.exists(inFilename))
        {
            // TODO: inline
            const outFilename = path.join(outputDir, imageFilename);
            await copy(imageFilename);
        }
    }
    
    // DCM
    const clickTag = dom.window.document.createElement("script");
    clickTag.type = "text/javascript";
    clickTag.innerHTML = ' var clickTag = "https://google.com"; ';
    head.appendChild(clickTag);
    link.setAttribute("href", "javascript:void(window.open(window.clickTag))");
    link.setAttribute("aria-label", "Перейти по ссылке в баннере");
    
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
