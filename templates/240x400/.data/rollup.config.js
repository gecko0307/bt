const { folders: { input = "./src", output = "./HTML/" } = {}} = require(process.cwd() + "/package.json");

const extend = "develop"; // develop, production, source

const config = {
	input: input + "/banner.js",
	
	output: {
		file: output + "/animation.js",
		sourcemap: true
	}
};

module.exports = {
	config, extend
};
