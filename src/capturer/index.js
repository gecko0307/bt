const fs = require("fs-extra");
const path = require("path");
const { createCanvas, Image } = require("canvas");
const { writePsdBuffer } = require("ag-psd");
const GIFEncoder = require("gifencoder");
const greensock = require("./greensock");

const cwd = process.cwd();

async function captureFunc(options = {}) {
    const captureDir = path.join(cwd, "capture");
    if (!fs.existsSync(captureDir)){
        fs.mkdirSync(captureDir);
    }
    
    const captureImages = (options.video !== true);
    
    // Capture frames/video from GreenSock banner
    const capture = await greensock.capture({
        outPath: captureDir,
        width: options.width || 0,
        height: options.height || 0,
        video: options.video || false
    });
    
    if (!captureImages) {
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
    
    const gif = new GIFEncoder(capture.width, capture.height);
    gif.start();
    // TODO: repeat should be in some config
    gif.setRepeat(0); // 0 for repeat, -1 for no-repeat
    gif.setQuality(10);
    
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
        
        frames.push(`${i}.png`);
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
