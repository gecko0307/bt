#!/usr/bin/env node

const path = require("path");

const cwd = process.cwd();
const [,, ...args] = process.argv;
//console.log(`${args}`);

const builder = require("./builder");

async function build()
{
    console.log("BannerToolchain build");
    const rollup = path.join(__dirname, "node_modules", ".bin", "rollup");
    const rollupConfig = path.join(__dirname, "rollup.config.prod.js"); 
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
    const rollup = path.join(__dirname, "node_modules", ".bin", "rollup");
    const rollupConfig = path.join(__dirname, "rollup.config.dev.js");
    const rollupCmd = `${rollup} -c ${rollupConfig} -m --watch`;
    const code = await execute(rollup, ["-c", rollupConfig, "-m", "--watch"]);
}

if (args.length > 0)
{
    if (args[0] === "build")
    {
        build();
    }
    else if (args[0] === "run")
    {
        run();
    }
}
