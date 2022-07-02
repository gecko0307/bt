const fs = require("fs-extra");
const path = require("path");
const puppeteer = require("puppeteer");
const { record } = require("./puppeteer-recorder");

async function capture(options) {
    const captureFuncPath = path.join(__dirname, "captureGreensock.js");
    const captureFunc = await fs.readFile(captureFuncPath, "utf8");
    
    const deleteDevToolsPath = path.join(__dirname, "deleteDevTools.js");
    const deleteDevTools = await fs.readFile(deleteDevToolsPath, "utf8");
    
    const videoFilename = options.videoFilename || "video.mp4";
    const videoPath = path.join(options.outPath, videoFilename);

    const screenshotFilename = options.screenshotFilename || "screenshot.png";
    console.log(screenshotFilename);
    
    const url = options.url || "http://localhost:8000/";
    
    const result = {
        frames: []
    };

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    page.on("console", (message) => console.log(message.text()));
    page.on("pageerror", ({ message }) => console.log(message));
    page.on("requestfailed", (request) => console.log(`${request.failure().errorText} ${request.url()}`));
    
    await page.evaluateOnNewDocument(captureFunc);
    try {
        await page.goto(url, { waitUntil: ["load", "domcontentloaded", "networkidle0" ] });
    }
    catch(error) {
        console.log(error.message);
        await browser.close();
        return result;
    }
    
    await page.evaluate(deleteDevTools);

    const banner = await page.evaluate(() => {
        if (window.animation !== undefined) {
            let animation = window.animation;
            let bannerType = "gsap";
            let bannerVersion;
            if (animation.info) {
                bannerType = animation.info.type;
                bannerVersion = animation.info.version;
            }
            else {
                // Old template version
                bannerVersion = animation.version || 0;
            }
            const container = document.getElementById("container");

            let duration = 0;
            if (animation.master) {
                duration = animation.master.duration();
            }

            const info = {
                type: bannerType,
                version: bannerVersion,
                width: container.offsetWidth,
                height: container.offsetHeight,
                duration: duration,
                frames: window.frames
            };
            return info;
        }
        else {
            return {
                type: "unknown",
                version: 0,
                width: 0,
                height: 0,
                duration: 0,
                frames: []
            };
        }
    });
    
    if (options.width && options.width !== 0) banner.width = options.width;
    if (options.height && options.height !== 0) banner.height = options.height;

    console.log("Banner info:");
    console.log(`Size: ${banner.width}x${banner.height}`);
    console.log(`Template type: ${banner.type}`);
    console.log(`Template version: ${banner.version}`);
    console.log(`Master timeline duration: ${banner.duration}`);
    console.log(`Capture frames count: ${banner.frames.length}`);

    result.type = banner.type;
    result.width = banner.width;
    result.height = banner.height;
    result.duration = banner.duration;

    await page.setViewport({
        width: banner.width,
        height: banner.height,
        deviceScaleFactor: options.zoom || 1,
    });

    if (options.screenshot === true) {
        // Capture screenshot
        let screenshotTime = options.screenshotTime || 0;
        if (banner.duration === 0) screenshotTime = 0;

        console.log(`Capture screenshot at ${screenshotTime}s...`);

        if (banner.duration > 0) {
            await page.evaluate(`window.gsap.globalTimeline.pause(${screenshotTime})`);
        }

        const pngPath = `${options.outPath}/${screenshotFilename}`;
        await page.screenshot({ 
            path: pngPath,
            omitBackground: options.transparent || false
        });
        return result;
    }
    
    if (banner.type !== "gsap") {
        console.log("Error: only GreenSock banners are supported!");
        await browser.close();
        return result;
    }

    if (banner.duration === 0) {
        console.log("Error: master timeline (animation.master) not found!");
        await browser.close();
        return result;
    }
    
    if (options.video === true) {
        // Capture video
        let videoDuration = options.videoDuration;
        if (videoDuration === 0) videoDuration = result.duration || 5;
        const videoFps = options.videoFps || 60;
        const videoCompressionRate = options.videoCompressionRate || 1;
        const frameTime = 1.0 / videoFps;
        console.log(`Capture video: ${videoDuration}s at ${videoFps}fps...`);
        await record({
            browser: browser,
            page: page,
            output: videoPath,
            fps: videoFps,
            crf: videoCompressionRate,
            frames: videoFps * videoDuration,
            prepare: async function(browser, page) {
                // Executed before first capture
            },
            render: async function(browser, page, frame) {
                // Executed before each frame
                const time = (frame - 1) * frameTime;
                await page.evaluate((t) => {
                    window.animation.master.pause(t, false);
                }, time);
            }
        });
        console.log(`Generated ${videoFilename}`);
    }
    else {
        // Capture fallback frames
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
