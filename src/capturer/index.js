const fs = require("fs-extra");
const path = require("path");
const execFile = require("util").promisify(require("child_process").execFile);
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
    options.maxSize = options.maxSize || config.maxSize || 120;
    if (config.gif) {
        options.gifRepeat = config.gif.repeat || true;
        options.gifQuality = config.gif.quality || 100;
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
    
    let useGifski = false;
    if (process.platform === "win32")
        useGifski = true;
    
    let gif;
    if (!useGifski) {
        gif = new GIFEncoder(capture.width, capture.height);
        gif.start();
        gif.setRepeat(repeat);
        gif.setQuality(options.gifQuality || 10);
    }
    
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
        
        if (!useGifski) {
            gif.setDelay(frame.delay);
            gif.addFrame(ctx);
        }
        
        frames.push(`${i+1}.png`);
    }
    
    // TODO: use JPEG for one-frame capture
    
    const maxGifSize = options.maxSize;
    
    // Generate GIF file
    const gifPath = `${captureDir}/fallback.gif`;
    let gifSize = 0;
    if (useGifski) {
        let quality = options.gifQuality || 100;
        console.log(`Trying with quality ${quality}...`);
        gifSize = await gifski(capture, gifPath, quality) / 1024;
        if (gifSize === 0) {
            console.log("Error");
            return;
        }
        
        while (gifSize > maxGifSize && quality > 0) {
            quality--;
            console.log(`Overweight (${parseInt(gifSize)} KB), trying with quality ${quality}...`);
            gifSize = await gifski(capture, gifPath, quality) / 1024;
            if (gifSize === 0) {
                console.log("Error");
                return;
            }
        }
        
        gifSize = gifSize.toFixed(2);
    }
    else {
        gif.finish();
        const gifBuffer = gif.out.getData();
        fs.writeFileSync(gifPath, gifBuffer);
        gifSize = (Buffer.byteLength(gifBuffer) / 1024).toFixed(2);
    }
    
    // Check GIF file size
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

async function gifski(capture, outputFile, quality = 100) {
    const gifskiPath = path.join(__dirname, "..", "..", "bin", "gifski.exe");
    let frames = [];
    let delays = [];
    
    for (let i = 0; i < capture.frames.length; i++) {
        const frame = capture.frames[i];
        frames.push(frame.path);
        delays.push(frame.delay);
    }
    
    const delaysParam = delays.map(d => parseInt(d)).join(",");
    
    const gifskiOptions = [
        ...frames,
        "--delays", delaysParam,
        "--output", outputFile,
        "--quality", quality
    ];
    
    try {
        await execFile(gifskiPath, gifskiOptions);
    } catch (e) {
        console.error(e);
        return 0;
    }
    
    const stats = await fs.stat(outputFile);
    const fileSizeInBytes = stats.size;
    return fileSizeInBytes;
}

module.exports = captureFunc;
