const fs = require("fs-extra");
const path = require("path");
const { createCanvas, Image } = require("canvas");
const { writePsdBuffer } = require("ag-psd");
const GIFEncoder = require("gifencoder");
const greensock = require("./greensock");

function requireUncached(module) {
    delete require.cache[require.resolve(module)];
    return require(module);
}

const captureConfigPath = path.resolve("./.data/capture.config.json");

async function captureFunc(options = {}) {
    let config = {};
    if (await fs.pathExists(captureConfigPath)) {
        config = requireUncached(captureConfigPath) || {};
    }
    options.url = config.url;
    options.width = options.width || config.width || 0;
    options.height = options.height || config.height || 0;
    if (config.gif) {
        options.gifRepeat = config.gif.repeat;
        options.gifQuality = config.gif.quality;
    }
    if (config.video) {
        options.videoFilename = config.video.filename;
        options.videoFps = config.video.fps;
        options.videoCompressionRate = config.video.compressionRate;
        options.videoDuration = config.video.duration;
    }
    // TODO: add other options to config

    const captureDir = path.resolve("./capture");
    if (!fs.existsSync(captureDir)){
        fs.mkdirSync(captureDir);
    }
    
    const captureImages = (options.video !== true && options.screenshot !== true);
    
    // Capture frames/video from GreenSock banner
    const capture = await greensock.capture({
        url: options.url || "http://localhost:8000/",
        outPath: captureDir,
        width: options.width || 0,
        height: options.height || 0,
        video: options.video || false,
        screenshot: options.screenshot || false,
        screenshotFilename: options.screenshotFilename || "screenshot.png",
        screenshotTime: options.screenshotTime || 0,
        transparent: options.transparent || false,
        zoom: options.zoom || 1,
        gifRepeat: options.gifRepeat || true,
        gifQuality: options.gifQuality || 10,
        videoFilename: options.videoFilename || "video.mp4",
        videoFps: options.videoFps || 60,
        videoCompressionRate: options.videoCompressionRate || 1,
        videoDuration: options.videoDuration
    });
    
    if (!captureImages) {
        // We don't need PNG and GIF
        return [];
    }
    else if (capture.frames.length === 0) {
        console.log("No images captured");
        return [];
    }
    else {
        console.log("Captured", capture.frames.length, "frames");
    }
    
    const psd = {
        width: capture.width,
        height: capture.height,
        children: []
    };
    
    // 0 for repeat, -1 for no-repeat
    let repeat = 0;
    if (options.gifRepeat === false)
        repeat = -1;
    
    const gif = new GIFEncoder(capture.width, capture.height);
    gif.start();
    gif.setRepeat(repeat);
    gif.setQuality(options.gifQuality || 10);
    
    let frames = [];
    
    // Load frames
    for (let i = 0; i < capture.frames.length; i++) {
        const frame = capture.frames[i];
        
        const img = new Image();
        img.src = await fs.readFile(frame.path);
        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        
        psd.children.push({
            name: `#${i+1} (${frame.delay}ms)`,
            canvas: canvas
        });
        
        gif.setDelay(frame.delay);
        gif.addFrame(ctx);
        
        frames.push(`${i+1}.png`);
    }
    
    // Generate GIF file
    gif.finish();
    const gifBuffer = gif.out.getData();
    const gifPath = `${captureDir}/fallback.gif`;
    fs.writeFileSync(gifPath, gifBuffer);
    const gifSize = (Buffer.byteLength(gifBuffer) / 1024).toFixed(2);
    const maxGifSize = 120;
    const color = (gifSize >= maxGifSize)? "\x1b[1m\x1b[31m" : "\x1b[1m\x1b[32m"; // Red if too large, green if ok
    outputStr = "Generated fallback.gif (" + color + `${gifSize} kb` + "\x1b[0m" + ")";
    console.log(outputStr);
    
    // Generate PSD file
    const psdBuffer = writePsdBuffer(psd);
    const psdPath = `${captureDir}/fallback.psd`;
    fs.writeFileSync(psdPath, psdBuffer);
    console.log(`Generated fallback.psd`);
    
    return frames;
}

module.exports = captureFunc;
