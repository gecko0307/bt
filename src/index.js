#!/usr/bin/env node
const fs = require("fs-extra");
const path = require("path");
const { execute } = require("./utils");
//const builder = require("./builder");
//const capturer = require("./capturer");

const cwd = process.cwd();
const [,, ...args] = process.argv;

async function isDirEmpty(dirname) {
    return fs.promises.readdir(dirname).then(files => {
        return files.length === 0;
    });
}

async function runRollup(rollupConfig, options = []) {
    const rollup = path.join(__dirname, "..", "node_modules", ".bin", "rollup");
    const rollupConfigPath = path.join(__dirname, "..", rollupConfig);
    const code = await execute(rollup, ["-c", rollupConfigPath, ...options]);
    return code;
}

async function build() {
    console.log("BannerToolchain build (WIP)");
    const code = await runRollup("rollup.config.prod.js");
    if (code === 0) {
        // TODO: run local Banner Builder if available
        /*
        console.log(config.platforms);
        if (config.platforms && config.platforms.length > 0) {
            for (const platform of config.platforms) {
                await builder("", "dist", platform, "dist_" + platform + ".zip");
            }
        }
        else {
            await builder("", "dist", "undefined", "dist.zip");
        }
        */
    }
    else {
        console.log("Build failed!");
    }
}

async function run() {
    console.log("BannerToolchain run");
    const code = await runRollup("rollup.config.dev.js", ["-m", "--watch"]);
}

async function init(template) {
    console.log("BannerToolchain init");
    if (await isDirEmpty(cwd) === true) {
        const templatePath = path.join(__dirname, "..", "templates", template);
        if (await fs.exists(templatePath)) {
            const destPath = path.join(cwd);
            await fs.copy(templatePath, destPath);
            console.log(`Initialized a project with template "${template}"`);
        }
        else {
            console.log(`Error: template "${template}" not found!`);
        }
    }
    else {
        console.log("Error: working directory is not empty!");
    }
}

async function capture() {
    console.log("BannerToolchain capture (WIP)");
    // await capturer(cwd);
}

if (args.length > 0) {
    if (args[0] === "build")
        build();
    else if (args[0] === "run")
        run();
    else if (args[0] === "capture")
        capture();
    else if (args[0] === "init")
        init(args[1] || "default");
}
