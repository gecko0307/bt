#!/usr/bin/env node
const fs = require("fs-extra");
const path = require("path");
const opener = require("opener");
const server = require("./server");
const capturer = require("./capturer");
const gulpBuilder = require("./gulp-builder");
const nativeBuilder = require("./builder2");
const deployer = require("./deployer");
const runRollup = require("./rollup");

const cwd = process.cwd();
const [,, ...args] = process.argv;

async function isDirEmpty(dirname) {
    return fs.promises.readdir(dirname).then(files => {
        return files.length === 0;
    });
}

function requireUncached(module) {
    delete require.cache[require.resolve(module)];
    return require(module);
}

const btConfigPath = path.join(__dirname, "..", "config.json");

async function build(options = { platform: "publish", root: "./" }) {
    console.log("BannerToolchain build");
    const root = options.root || "./";
    console.log(`Building ${path.resolve(root)}`);
    console.log("Bundle...");
    const mainModule = path.resolve(root, "src/banner.js");
    if (await fs.pathExists(mainModule)) {
        const code = await runRollup("rollup.config.prod.js", [], { cwd: path.resolve(root) });
        if (code !== 0)
            console.log("Bundling failed!");
    }
    else {
        console.log("Warning: main module (src/banner.js) not found");
    }

    let useGulpBuilder = false;
    let builderPath = "";

    let btConfig = {};
    if (await fs.pathExists(btConfigPath)) {
        btConfig = requireUncached(btConfigPath) || {};
    }
    if ("builder" in btConfig) {
        useGulpBuilder = btConfig.builder.useGulpBuilder || false;
        builderPath = btConfig.builder.path || "";
    }

    if (useGulpBuilder === true) {
        options.gulpBuilderPath = builderPath;
        await gulpBuilder(options);
    }
    else {
        await nativeBuilder.build(options);
    }
}

async function deploy(options = { branch: "" }) {
    console.log("BannerToolchain deploy (experimental)");
    await deployer({ ...options, buildFunc: build });
}

async function run(options = {}) {
    console.log("BannerToolchain run");
    const mainModule = path.join(cwd, "src", "banner.js");
    if (await fs.pathExists(mainModule)) {
        const code = await runRollup("rollup.config.dev.js", ["-m", "--watch"]);
    }
    else {
        console.log("Warning: main module (src/banner.js) not found, running server without Rollup");
        server.init();
        server.listen({
            onListen: function(server) {
                console.log("Opening", server.url);
                opener(server.url);
                console.log("Good luck!");
            }
        });
    }
}

async function init(options = { template: "default" }) {
    console.log("BannerToolchain init");
    const template = options.template || "default";
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

async function capture(options) {
    console.log("BannerToolchain capture");
    await capturer(options);
}

async function main() {
    if (args.length > 0) {
        if (args[0] === "init") {
            await init({
                template: args[1] || "default"
            });
            process.exit();
        }
        else if (args[0] === "run") {
            await run({});
        }
        else if (args[0] === "capture") {
            let width = 0;
            let height = 0;
            let video = args.includes("video");
            const resolution = /([0-9]+)x([0-9]+)/;
            for (arg of args) {
                const m = arg.match(resolution);
                if (m) {
                    width = parseInt(m[1]);
                    height = parseInt(m[2]);
                    break;
                }
            }
            await capture({
                video: video,
                width: width,
                height: height
            });
            process.exit();
        }
        else if (args[0] === "build") {
            await build({
                platform: args[1] || "publish", 
                version: args[2],
                root: "./"
            });
            process.exit();
        }
        else if (args[0] === "deploy") {
            await deploy({
                branch: args[1] || ""
            });
            process.exit();
        }
    }
}

(async () => {
    try {
        await main();
    }
    catch(e) {
    }
})();
