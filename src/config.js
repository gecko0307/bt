const path = require("path");
const fs = require("fs-extra");

function requireUncached(module) {
    delete require.cache[require.resolve(module)];
    return require(module);
}

const config = { };

const configFile = path.resolve("./package.json");
const config = requireUncached(configFile);

module.exports = config;
