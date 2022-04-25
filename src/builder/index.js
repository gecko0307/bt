const fs = require("fs-extra");
const path = require("path");
const Zip = require("adm-zip");
const { JSDOM } = require("jsdom");
const { fillMissing } = require("object-fill-missing-keys");
const { execute } = require("../utils");
const platforms = require("./platforms");
const runRollup = require("../rollup");

const cwd = process.cwd();

const builderConfigPath = path.resolve("./.data/builder.config.json");

const configDefault = {
    brand: "",
    campaign: "banner",
    platform: "publish",
    version: "v1"
};

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function requireUncached(module) {
    delete require.cache[require.resolve(module)];
    return require(module);
}

async function build(options = { platform: "publish", gulpBuilderPath: "" }) {
    let config = {};
    if (await fs.pathExists(builderConfigPath)) {
        config = requireUncached(builderConfigPath) || {};
    }
    config = fillMissing(config, configDefault);

    if (options.platform === "publish") {
        options.platform = config.platform;
    }
    
    let platformName = "Unknown";
    let technicalRequirements = "publish";
    let technicalRequirementsName = "Undefined";
    if (options.platform in platforms) {
        const p = platforms[options.platform];
        platformName = p.name;
        technicalRequirements = p.tr;
        if (technicalRequirements in platforms) {
            technicalRequirementsName = platforms[technicalRequirements].name;
        }
    }
    console.log("Platform:", platformName, `(${options.platform})`);
    console.log("Technical requirements:", technicalRequirementsName, `(${technicalRequirements})`);
    console.log("Version:", config.version);
    const code = await runRollup("rollup.config.prod.js");
    if (code === 0) {
        const inputPath = path.join(cwd, "HTML");
        const outputPath = path.join(cwd, "build");

        const builderPath = options.gulpBuilderPath || "";
        if (!(await fs.pathExists(builderPath))) {
            console.log("Builder not found!");
            return;
        }
        // TODO: check gulpfile.js

        console.log(`Using Gulp-builder in ${builderPath}`);
        const builderCode = await execute("npm", 
            ["run", "gulp", "--", "--task", `"${options.platform}"`, "--input", `"${inputPath}/"`, "--output", `"${outputPath}/"`, "--skip"], 
            { cwd: builderPath }
        );
        if (builderCode !== 0) {
            console.log("Build failed!");
        }
        else {
            console.log("Build finished!");

            // Get index.html
            const htmlPath = path.resolve("./build/index.html");
            // TODO: check if htmlPath exists
            const html = await fs.readFile(htmlPath);
            const dom = new JSDOM(html, { resources: "usable" });
            const container = dom.window.document.getElementById("container");
            const style = dom.window.getComputedStyle(container);
            const width = style.getPropertyValue("width");
            const height = style.getPropertyValue("height");
            const w = width.replace(/px/g, "").replace(/%/g, "P");
            const h = height.replace(/px/g, "").replace(/%/g, "P");
            let bannerSize = `_${w}x${h}`;
            if (config.size) {
                bannerSize = "_" + config.size;
            }

            // Make archive name
            let bannerName = "banner";
            if (config.brand.length > 0) {
                bannerName = config.brand;
                if (config.campaign.length > 0) bannerName += "_" + config.campaign;
            }
            else if (config.campaign.length > 0) {
                bannerName = config.campaign;
            }
    
            let platform = "";
            if (options.platform !== "publish") {
                platform = "_" + options.platform;
            }
    
            const zipFilename = `${bannerName}${bannerSize}${platform}_${config.version}.zip`;
            const zipPath = path.join(cwd, "dist", zipFilename);

            const zip = new Zip();
            const files = await fs.readdir(outputPath);
            files.forEach(filename => {
                const filePath = path.join(cwd, "build", filename);
                zip.addLocalFile(filePath);
            });
            zip.writeZip(zipPath);
            const { size } = await fs.stat(zipPath);
            console.log(`Generated ${zipPath} (${formatBytes(size)})`);
        }
    }
    else {
        console.log("Build failed!");
    }
}

module.exports = build;
