#!/usr/bin/env node

const path = require("path");
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const cwd = process.cwd();
const [,, ...args] = process.argv;

const builder = require("./builder");
//console.log(`${args}`);

async function build()
{
    console.log("BannerToolchain build");
    const rollup = path.join(__dirname, "node_modules", ".bin", "rollup");
    const rollupConfig = path.join(__dirname, "rollup.config.prod.js");
    const rollupCmd = `${rollup } -c ${rollupConfig}`;
    const { stdout, stderr } = await exec(rollupCmd);
    //console.log('stdout:', stdout);
    //console.error('stderr:', stderr);
    await builder("", "dist", "dist.zip");
}

async function run()
{
    console.log("BannerToolchain run");
    const rollup = path.join(__dirname, "node_modules", ".bin", "rollup");
    const rollupConfig = path.join(__dirname, "rollup.config.dev.js");
    const rollupCmd = `${rollup } -c ${rollupConfig} -m --watch`;
    const { stdout, stderr } = await exec(rollupCmd);
    console.log('stdout:', stdout);
    console.error('stderr:', stderr);
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
