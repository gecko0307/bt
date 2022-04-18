const fs = require("fs-extra");
const path = require("path");
const puppeteer = require("puppeteer");
const { writePsdBuffer } = require("ag-psd");
const { createCanvas, Image } = require("canvas");

async function loadCanvasFromFile(filePath) {
	const img = new Image();
	img.src = await fs.readFile(filePath);
	const canvas = createCanvas(img.width, img.height);
	canvas.getContext("2d").drawImage(img, 0, 0);
	return canvas;
}

async function capture(options) {
    const injectScriptPath = path.join(__dirname, "inject-greensock.js");
    const injectScript = await fs.readFile(injectScriptPath, "utf8");

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    await page.evaluateOnNewDocument(injectScript);
    await page.goto("http://localhost:8000/", { waitUntil: ["load", "domcontentloaded", "networkidle0" ] });
    
    const banner = await page.evaluate(() => {
        if (animation !== undefined) {
            const bannerType = animation.info.type;
            const bannerVersion = animation.info.version;
            const container = document.getElementById("container");
            return {
                type: bannerType,
                version: bannerVersion,
                width: container.offsetWidth,
                height: container.offsetHeight,
                frames: window.frames
            };
        }
        else {
            return {
                type: "unknown"
            };
        }
    });

    if (banner.type !== "gsap") {
        console.log("Error: GreenSock animation not found");
        return;
    }
    
    await page.setViewport({
        width: banner.width,
        height: banner.height,
        deviceScaleFactor: 1,
    });

    const psd = {
        width: banner.width,
        height: banner.height,
        children: []
    };

    // TODO: remove all files in capture directory

    for (let frame = 0; frame < banner.frames.length; frame++) {
        await page.evaluate("window.frames[" + frame + "][0]()"); // run pause function
        const delay = banner.frames[frame][1] / 1000; // frame delay in seconds
        const pngPath = `${options.outPath}/${frame}.png`;
        await page.screenshot({ path: pngPath });
        psd.children.push({
            name: `Layer ${frame+1}`,
            canvas: await loadCanvasFromFile(pngPath)
        });
    }
    console.log("Generated", banner.frames.length, "frames");
    
    // Generate PSD file
    const buffer = writePsdBuffer(psd);
    const psdPath = `${options.outPath}/fallback.psd`;
    fs.writeFileSync(psdPath, buffer);
    console.log(`Generated ${psdPath}`);

    // TODO: generate GIF file

    await browser.close();
}

module.exports = { capture };
