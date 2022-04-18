const fs = require("fs-extra");
const path = require("path");
const puppeteer = require("puppeteer");

async function capture(options) {
    const captureFuncPath = path.join(__dirname, "captureGreensock.js");
    const captureFunc = await fs.readFile(captureFuncPath, "utf8");
    
    const deleteDevToolsPath = path.join(__dirname, "deleteDevTools.js");
    const deleteDevTools = await fs.readFile(deleteDevToolsPath, "utf8");
    
    const result = {
        frames: []
    };

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    await page.evaluateOnNewDocument(captureFunc);
    try {
        await page.goto("http://localhost:8000/", { waitUntil: ["load", "domcontentloaded", "networkidle0" ] });
    } catch(error) {
        console.log(error.message);
        await browser.close();
        return result;
    }
    
    await page.evaluate(deleteDevTools);
    
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
    
    result.type = banner.type;
    result.width = banner.width;
    result.height = banner.height;
    
    if (banner.type !== "gsap") {
        console.log("Error: GreenSock animation not found");
        await browser.close();
        return result;
    }
    
    await page.setViewport({
        width: banner.width,
        height: banner.height,
        deviceScaleFactor: 1,
    });

    for (let frame = 0; frame < banner.frames.length; frame++) {
        await page.evaluate("window.frames[" + frame + "][0]()"); // run pause function
        const delay = banner.frames[frame][1]; // frame delay in milliseconds
        const pngPath = `${options.outPath}/${frame}.png`;
        await page.screenshot({ path: pngPath });
        
        result.frames.push({
            path: pngPath,
            delay: delay
        });
    }
    
    await browser.close();
    
    return result;
}

module.exports = { capture };
