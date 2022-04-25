const os = require("os");
const fs = require("fs-extra");
const path = require("path");
const decodePNG = require("./png-decoder");
const imageq = require("image-q");
const PngQuant = require("pngquant");
const util = require("util");
const execFile = util.promisify(require("child_process").execFile);
const { nanoid } = require("nanoid");
const { streamToFile } = require("../utils");

const tempFolderPath = path.join(os.homedir(), ".bt", "images", "tmp");

async function compress(inputStream, options) {
	const compressOpts = options.options.compress;
	let outStream = inputStream;
	
	if (!compressOpts.lossless) {
		const colors = Math.floor(options.quality / 100 * 256);
		const pngQuanter = new PngQuant([colors, "--strip"]);

		// Decode PNG from stream
		const png = await decodePNG(inputStream);

		// Create image-q image
		const inPointContainer = imageq.utils.PointContainer.fromUint8Array(
			png.data, png.width, png.height
		);

		// Create image-q palette
		const palette = await imageq.buildPalette([inPointContainer], {
			colorDistanceFormula: "manhattan",
			paletteQuantization: compressOpts.paletteDithering || "wuquant",
			colors: colors
		});

		// Dithering
		const outPointContainer = await imageq.applyPalette(inPointContainer, palette, {
			colorDistanceFormula: "manhattan",
			imageQuantization: compressOpts.imageDithering || "atkinson"
		});

		// Write data back to PNG image and create output stream
		png.data = outPointContainer.toUint8Array();
		outStream = png.pack().pipe(pngQuanter);
	}

	// Use ECT for lossless compression under Windows
	const ectPath = path.join(__dirname, "..", "..", "..", "bin", "ect.exe");
	const isWindows = process.platform === "win32";
	if (isWindows) {
		const filename = nanoid() + ".png";
		if (!(await fs.pathExists(tempFolderPath))) {
			await fs.mkdir(tempFolderPath, { recursive: true });
		}
		const tempFilename = path.join(tempFolderPath, filename);
		await streamToFile(outStream, tempFilename);
		await execFile(ectPath, ["-9", "-strip", "--mt-deflate", tempFilename]);
		outStream = fs.createReadStream(tempFilename);
	}
	else {
		console.log("Sorry, PNG lossless compression is Windows-only");
	}

	return outStream;
}

module.exports = compress;
