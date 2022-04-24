#!/usr/bin/env node
const fs = require("fs-extra");
const path = require("path");
const capturer = require("./capturer");
const builder = require("./builder");

const cwd = process.cwd();
const [,, ...args] = process.argv;

async function isDirEmpty(dirname) {
    return fs.promises.readdir(dirname).then(files => {
        return files.length === 0;
    });
}

async function build(options = { platform: "publish", version: "v1" }) {
    console.log("BannerToolchain build");
    await builder(options);
}

async function run(options = {}) {
    console.log("BannerToolchain run");
    const code = await runRollup("rollup.config.dev.js", ["-m", "--watch"]);
}

async function init(options = { template: "default" }) {
    console.log("BannerToolchain init");
    const template = options.template || "default";
    if (await isDirEmpty(cwd) === true) {
        const templatePath = path.join(__dirname, "..", "templates", template);
        if (await fs.pathExists(templatePath)) {
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

async function capture(options) {
    console.log("BannerToolchain capture");
    await capturer(options);
}

if (args.length > 0) {
    if (args[0] === "init") {
        init({
            options: args[1] || "default"
        });
    }
    else if (args[0] === "run") {
        run({});
    }
    else if (args[0] === "capture") {
        capture({
            video: (args[1] === "video")
        });
    }
    else if (args[0] === "build") {
        build({
            platform: args[1] || "publish", 
            version: args[2] || "v1"
        });
    }
}
