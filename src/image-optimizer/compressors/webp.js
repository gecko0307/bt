const path = require("path");
const CWebp = require("cwebp").CWebp;
const commandExists = require("command-exists").sync;

async function compress(inputStream, options) {
	const compressOpts = options.options.compress;

	const isWindows = process.platform === "win32";

	let encoder;
	if (isWindows) {
		// On Windows we use our own cwebp binary
		const webpPath = path.join(__dirname, "..", "..", "..", "bin", "cwebp.exe");
		encoder = new CWebp(inputStream, webpPath);
	}
	else {
		// On non-Windows OS we rely on system-wide cwebp
		if (!commandExists("cwebp")) throw new Error("cwebp is not installed");
		encoder = new CWebp(inputStream);
	}

	encoder.quality(options.quality);
	encoder.lossless(compressOpts.lossless);
	return encoder.stream();
}

module.exports = compress;