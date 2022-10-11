const path = require("path");
const { execute } = require("./utils");

async function runRollup(rollupConfig, options = [], spawnOptions = {}) {
    const rollup = path.join(__dirname, "..", "node_modules", ".bin", "rollup");
    const rollupConfigPath = path.join(__dirname, "..", rollupConfig);
    const code = await execute(rollup, ["-c", rollupConfigPath, ...options], spawnOptions);
    return code;
}

module.exports = runRollup;
