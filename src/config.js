const path = require("path");
const fs = require("fs-extra");

function requireUncached(module) {
    delete require.cache[require.resolve(module)];
    return require(module);
}

let config = { };

const configFile = path.resolve("./package.json");

if (fs.existsSync(configFile)) {
    config = requireUncached(configFile);
}

module.exports = config;
