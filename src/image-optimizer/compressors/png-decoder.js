const PNG = require("pngjs").PNG;

function decodePNG(inputStream) {
	return new Promise((resolve, reject) => {
		inputStream.pipe(new PNG())
		.on("parsed", function(){
			resolve(this);
		})
		.on("error", err => reject(err));
	});
}

module.exports = decodePNG;
