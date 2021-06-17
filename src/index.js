#!/usr/bin/env node

const path = require("path");
const { execute } = require("./utils");
const builder = require("./builder");
const capturer = require("./capturer");

const cwd = process.cwd();
const [,, ...args] = process.argv;

async function build()
{
    console.log("BannerToolchain build");
    const rollup = path.join(__dirname, "..", "node_modules", ".bin", "rollup");
    const rollupConfig = path.join(__dirname, "..", "rollup.config.prod.js"); 
    const code = await execute(rollup, ["-c", rollupConfig]);
    if (code === 0) {
        await builder("", "dist", "dist.zip");
    }
    else {
        console.log("Build aborted!");
    }
}

async function run()
{
    console.log("BannerToolchain run");
    const rollup = path.join(__dirname, "..", "node_modules", ".bin", "rollup");
    const rollupConfig = path.join(__dirname, "..", "rollup.config.dev.js");
    await execute(rollup, ["-c", rollupConfig, "-m", "--watch"]);
}

async function capture()
{
    console.log("BannerToolchain capture");
    await capturer(cwd);
}

if (args.length > 0)
{
    if (args[0] === "build")
        build();
    else if (args[0] === "run")
        run();
    else if (args[0] === "capture")
        capture();
}
