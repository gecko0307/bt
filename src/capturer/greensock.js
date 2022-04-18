const fs = require("fs-extra");
const path = require("path");
const puppeteer = require("puppeteer");

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

    // TODO: remove files in capture directory
    for (let frame = 0; frame < banner.frames.length; frame++) {
        await page.evaluate("window.frames[" + frame + "][0]()"); // run pause function
        const delay = banner.frames[frame][1] / 1000; // frame delay in seconds
        await page.screenshot({ path: `${options.outPath}/${frame}.png` });
    }
    console.log("Generated", banner.frames.length, "frames");

    // TODO: create PSD file

    await browser.close();
}

module.exports = { capture };
