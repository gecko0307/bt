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
const { spawn } = require('child_process');
const puppeteer = require('puppeteer');

module.exports.record = async function(options) {
  const browser = options.browser || (await puppeteer.launch());
  const page = options.page || (await browser.newPage());

  await options.prepare(browser, page);

  var ffmpegPath = options.ffmpeg || 'ffmpeg';
  var fps = options.fps || 60;

  var outFile = options.output;

  const args = ffmpegArgs(fps);

  if ('format' in options) args.push('-f', options.format);
  else if (!outFile) args.push('-f', 'matroska');

  args.push(outFile || '-');

  const ffmpeg = spawn(ffmpegPath, args);

  if (options.pipeOutput) {
    ffmpeg.stdout.pipe(process.stdout);
    ffmpeg.stderr.pipe(process.stderr);
  }

  const closed = new Promise((resolve, reject) => {
    ffmpeg.on('error', reject);
    ffmpeg.on('close', resolve);
  });

  for (let i = 1; i <= options.frames; i++) {
    if (options.logEachFrame)
      console.log(
        `[puppeteer-recorder] rendering frame ${i} of ${options.frames}.`
      );

    await options.render(browser, page, i);

    let screenshot = await page.screenshot({ omitBackground: true });

    await write(ffmpeg.stdin, screenshot);
  }

  ffmpeg.stdin.end();

  await closed;
};

const ffmpegArgs = fps => [
  '-y',
  '-f',
  'image2pipe',
  '-r',
  `${+fps}`,
  '-i',
  '-',
  '-c:v',
  'libvpx-vp9',
  '-crf',
  '30',
  '-auto-alt-ref',
  '0',
  '-pix_fmt',
  'yuva420p',
  '-metadata:s:v:0',
  'alpha_mode="1"'
];

const write = (stream, buffer) =>
  new Promise((resolve, reject) => {
    stream.write(buffer, error => {
      if (error) reject(error);
      else resolve();
    });
  });
