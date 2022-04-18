const fs = require("fs-extra");
const path = require("path");
const puppeteer = require("puppeteer");
const { createCanvas, Image } = require("canvas");
const { writePsdBuffer } = require("ag-psd");
const GIFEncoder = require("gifencoder");

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
    
    // TODO: PSD and GIF generation should be done outside of this module

    const psd = {
        width: banner.width,
        height: banner.height,
        children: []
    };

    // TODO: remove all files in capture directory
    
    // TODO: get GIF settings from function options
    const gif = new GIFEncoder(banner.width, banner.height);
    gif.start();
    gif.setRepeat(0);   // 0 for repeat, -1 for no-repeat
    gif.setQuality(10); // image quality. 10 is default.
    
    let frames = [];

    for (let frame = 0; frame < banner.frames.length; frame++) {
        await page.evaluate("window.frames[" + frame + "][0]()"); // run pause function
        const delay = banner.frames[frame][1]; // frame delay in milliseconds
        const pngPath = `${options.outPath}/${frame}.png`;
        await page.screenshot({ path: pngPath });
        
        const img = new Image();
        img.src = await fs.readFile(pngPath);
        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        
        psd.children.push({
            name: `#${frame+1} (${delay}ms)`,
            canvas: canvas
        });
        frames.push(`${frame}.png`);
        gif.setDelay(delay);
        gif.addFrame(ctx);
    }
    console.log("Generated", banner.frames.length, "frames");
    
    // Generate GIF file
    gif.finish();
    const gifBuffer = gif.out.getData();
    const gifPath = `${options.outPath}/fallback.gif`;
    fs.writeFileSync(gifPath, gifBuffer);
    
    // Generate PSD file
    const psdBuffer = writePsdBuffer(psd);
    const psdPath = `${options.outPath}/fallback.psd`;
    fs.writeFileSync(psdPath, psdBuffer);
    console.log(`Generated ${psdPath}`);

    await browser.close();
    
    return frames;
}

module.exports = { capture };
