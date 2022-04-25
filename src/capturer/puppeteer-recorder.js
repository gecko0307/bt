/*
MIT License

Copyright (c) 2017 Clipisode

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
const { spawn } = require("child_process");
const puppeteer = require("puppeteer");

module.exports.record = async function(options) {
    const browser = options.browser || (await puppeteer.launch());
    const page = options.page || (await browser.newPage());

    await options.prepare(browser, page);

    const ffmpegPath = options.ffmpeg || "ffmpeg";
    const fps = options.fps || 60;
    const crf = options.crf || 1;

    const outFile = options.output;

    const args = ffmpegArgs(fps, crf);

    if ("format" in options) args.push("-f", options.format);
    else if (!outFile) args.push("-f", "mp4");

    args.push(outFile || "-");

    const ffmpeg = spawn(ffmpegPath, args);

    if (options.pipeOutput) {
        ffmpeg.stdout.pipe(process.stdout);
        ffmpeg.stderr.pipe(process.stderr);
    }

    const closed = new Promise((resolve, reject) => {
        ffmpeg.on("error", reject);
        ffmpeg.on("close", resolve);
    });

    for (let i = 1; i <= options.frames; i++) {
        if (options.logEachFrame)
            console.log(`[puppeteer-recorder] rendering frame ${i} of ${options.frames}.`);
        await options.render(browser, page, i);
        const screenshot = await page.screenshot({ omitBackground: true });
        await write(ffmpeg.stdin, screenshot);
    }

    ffmpeg.stdin.end();

    await closed;
};

function ffmpegArgs(fps, crf = 1) { return [
    // Overwrite output files without asking
    "-y",
    
    // Accept individual frames as input
    "-f", "image2pipe",
    
    // Frame rate
    "-r", `${+fps}`,
    
    // No input file
    "-i", "-",
    
    // Video codec
    "-c:v", "libx264",
    
    // H.264: Constant Rate Factor (0 - lossless, 51 - worst)
    "-crf", `${crf}`,
    
    // Pixel format
    "-pix_fmt", "yuva420p",
    
    //
    "-metadata:s:v:0",
    
    //
    `alpha_mode="1"`
]};

const write = (stream, buffer) =>
    new Promise((resolve, reject) => {
        stream.write(buffer, error => {
            if (error) reject(error);
            else resolve();
        });
    });
