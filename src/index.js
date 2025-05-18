#!/usr/bin/env node
const fs = require("fs-extra");
const path = require("path");
const opener = require("opener");
const Git = require("simple-git");
const server = require("./server");
const capturer = require("./capturer");
const gulpBuilder = require("./gulp-builder");
const nativeBuilder = require("./builder2");
const deployer = require("./deployer");
const runRollup = require("./rollup");
const parseRepoUrl = require("./deployer/parseRepoUrl");
const parseBranch = require("./deployer/parseBranch");

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

    // Builder options
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

function getCurrentBranch(git) {
    return new Promise((resolve, reject) => {
        git.branch(function(err, res){
            if (err) reject(err);
            let current = null;
            for (let name in res.branches) {
                if (res.branches[name].current) {
                    current = res.branches[name];
                    break;
                }
            }
            resolve(current);
        });
    });
}

function getBranchCreative(branchData) {
    return branchData.creative || "";
}

function getBranchSize(branchData) {
    let size = "";
    if (branchData.props) {
        if (branchData.props.width && branchData.props.height) {
            let w = branchData.props.width;
            let h = branchData.props.height;
            if (branchData.props.minWidth) {
                const minW = branchData.props.minWidth;
                w += `(${minW}`;
                if (branchData.props.maxWidth) {
                    const maxW = branchData.props.maxWidth;
                    w += `-${maxW})`;
                }
                else
                    w += ")";
            }
            if (branchData.props.minHeight) {
                const minH = branchData.props.minHeight;
                h += `(${minH}`;
                if (branchData.props.maxHeight) {
                    const maxH = branchData.props.maxHeight;
                    h += `-${maxH})`;
                }
                else
                    h += ")";
            }
            size = `${w}x${h}`;
        }
    }
    return size;
}

function getBranchPlatform(branchData) {
    let platform = "publish";
    if (branchData.platform && branchData.platform.length > 0)
        platform = branchData.platform;
    return platform;
}

function getBranchVersion(branchData) {
    let version = "v1";
    if (branchData.version && branchData.version.length > 0)
        version = branchData.version;
    return version;
}

async function init(options = { template: "default" }) {
    console.log("BannerToolchain init");
    
    const template = options.template || "default";
    const templatePath = path.join(__dirname, "..", "templates", template);
    if (await fs.pathExists(templatePath)) {
        console.log(`Initializing a project with template "${template}"...`);
        const destPath = path.join(cwd);
        fs.copySync(templatePath, destPath);
        
        // Update project's package.json
        const projectConfig = require("./config");
        if ("name" in projectConfig && projectConfig.name === "smarthead-banner") {
            projectConfig.version = new Date().toISOString().substring(0, 10).replace(/-/g, ".");
            const packageJson = JSON.stringify(projectConfig, null, '\t');
            await fs.writeFile(path.resolve("./package.json"), packageJson, "utf8");
            console.log(`Set package verison to "${projectConfig.version}"`);
        }
        
        // Generate .data/builder.config.json
        const git = Git(cwd);
        git.outputHandler(function(command, stdout, stderr) {
            //stdout.pipe(process.stdout);
            stderr.pipe(process.stderr);
        });
        if (await git.checkIsRepo()) {
            console.log("Git repo found");
            let url = (await git.raw(["config", "--get", "remote.origin.url"])).trim();
            if (url.endsWith(".git")) {
                url = url.substring(0, url.length - 4);
            }
            const repoInfo = parseRepoUrl(url);
            const projectName = repoInfo.project;
            const branch = await getCurrentBranch(git);
            const branchData = parseBranch(branch.name);
            
            console.log(`Project: ${projectName}`);
            console.log(`Branch: ${branch.name}`);
            
            const builderConfig = {
                brand: projectName,
                campaign: "", // ?
                creative: getBranchCreative(branchData),
                platform: getBranchPlatform(branchData),
                size: getBranchSize(branchData),
                version: getBranchVersion(branchData)
            };
            
            const dataPath = path.resolve(".data");
            await fs.mkdir(dataPath, { recursive: true });
            const filePath = path.join(dataPath, "builder.config.json");
            const builderConfigJson = JSON.stringify(builderConfig, null, '\t');
            await fs.writeFile(filePath, builderConfigJson, "utf8");
            console.log("Update .data/builder.config.json");
        }
        
        console.log(`Done!`);
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
