const fs = require("fs-extra");
const path = require("path");
const puppeteer = require("puppeteer");
const { record } = require("./puppeteer-recorder");

async function capture(options) {
    const captureFuncPath = path.join(__dirname, "captureGreensock.js");
    const captureFunc = await fs.readFile(captureFuncPath, "utf8");
    
    const deleteDevToolsPath = path.join(__dirname, "deleteDevTools.js");
    const deleteDevTools = await fs.readFile(deleteDevToolsPath, "utf8");
    
    const videoPath = path.join(options.outPath, "video.webm");
    
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
            const duration = animation.master.duration();
            return {
                type: bannerType,
                version: bannerVersion,
                width: container.offsetWidth,
                height: container.offsetHeight,
                duration: duration,
                frames: window.frames
            };
        }
        else {
            return {
                type: "unknown"
            };
        }
    });
    
    if (options.width && options.width !== 0) banner.width = options.width;
    if (options.height && options.height !== 0) banner.height = options.height;
    
    result.type = banner.type;
    result.width = banner.width;
    result.height = banner.height;
    result.duration = banner.duration;
    
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
    
    if (options.video === true) {
        // Capture video
        const videoDuration = result.duration || 5;
        const videoFps = 60;
        const frameTime = 1.0 / videoFps;
        console.log(`Capture video: ${videoDuration}s at ${videoFps}fps...`);
        await record({
            browser: browser,
            page: page,
            output: videoPath,
            fps: videoFps,
            frames: videoFps * videoDuration,
            prepare: async function(browser, page) {
                // Executed before first capture
            },
            render: async function(browser, page, frame) {
                // Executed before each frame
                const position = (frame - 1) * frameTime;
                await page.evaluate((pos) => {
                    window.animation.master.pause(pos);
                }, position);
            }
        });
        console.log("Generated video.webm");
    }
    else {
        // Capture images
        for (let frame = 0; frame < banner.frames.length; frame++) {
            await page.evaluate("window.frames[" + frame + "][0]()"); // run pause function
            const delay = banner.frames[frame][1]; // frame delay in milliseconds
            const pngPath = `${options.outPath}/${frame+1}.png`;
            await page.screenshot({ path: pngPath });
            
            result.frames.push({
                path: pngPath,
                delay: delay
            });
        }
    }
    
    await browser.close();
    
    return result;
}

module.exports = { capture };
