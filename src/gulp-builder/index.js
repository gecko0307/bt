const fs = require("fs-extra");
const path = require("path");
const Zip = require("adm-zip");
const { JSDOM } = require("jsdom");
const { fillMissing } = require("object-fill-missing-keys");
const { execute } = require("../utils");
const platforms = require("./platforms");

const cwd = process.cwd();

const configDefault = {
    brand: "",
    campaign: "",
    creative: "",
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

async function build(options = { platform: "publish", gulpBuilderPath: "", root: "./" }) {
    console.log("Running gulp-builder...");
    const root = options.root || "./";
    const builderConfigPath = path.resolve(root, ".data/builder.config.json");
    
    let buildPath = path.resolve(root, "build");
    let distPath = path.resolve(root, "dist");
    if (options.buildPath) buildPath = path.resolve(options.buildPath);
    if (options.distPath) distPath = path.resolve(options.distPath);
    
    let config = {};
    if (await fs.pathExists(builderConfigPath)) {
        config = requireUncached(builderConfigPath) || {};
    }
    
    config = fillMissing(config, configDefault);

    config.brand = options.brand || config.brand;
    config.campaign = options.campaign || config.campaign;
    config.creative = options.creative || config.creative;
    config.version = options.version || config.version;
    config.size = options.size || config.size;

    if (options.platform === "publish") {
        options.platform = config.platform;
    }
    else {
        config.platform = options.platform;
    }

    await fs.writeJSON(builderConfigPath, config, { spaces: "\t" });
    
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
    else {
        technicalRequirements = options.platform;
    }
    console.log("Platform:", platformName, `(${options.platform})`);
    console.log("Technical requirements:", technicalRequirementsName, `(${technicalRequirements})`);
    console.log("Version:", config.version);

    const inputPath = path.resolve(root, "HTML");

    const builderPath = options.gulpBuilderPath || "";
    const gulpfilePath = path.join(builderPath, "gulpfile.js");
    if (!(await fs.pathExists(gulpfilePath))) {
        console.log(`Builder not found in ${builderPath}! Please, specify valid Gulp-builder installation path in config.json`);
        return { ok: false };
    }

    console.log(`Using Gulp-builder in ${builderPath}`);
    const builderCode = await execute("npm", 
        ["run", "gulp", "--", "--dropconsole", "--task", `"${technicalRequirements}"`, "--input", `"${inputPath}/"`, "--output", `"${buildPath}/"`, "--skip"], 
        { cwd: builderPath }
    );
    if (builderCode !== 0) {
        console.log("Build failed!");
        return { ok: false };
    }
    else {
        console.log("Build finished!");

        const htmlPath = path.resolve(buildPath, "index.html");
        // TODO: check if htmlPath exists
        const dom = await JSDOM.fromFile(htmlPath, { resources: "usable", pretendToBeVisual: true });

        function waitResourcesLoaded(resolve, reject) {
            const container = dom.window.document.getElementById("container");
            const style = dom.window.getComputedStyle(container);
            const width = style.getPropertyValue("width");
            const height = style.getPropertyValue("height");
            if (width && width.length > 0)
                resolve({ width, height });
            else
                setTimeout(waitResourcesLoaded.bind(this, resolve, reject), 100);
        }

        const bannerLoad = new Promise(waitResourcesLoaded);
        const { width, height } = await bannerLoad;
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
        
        if (config.creative.length > 0) {
            bannerName += "_" + config.creative;
        }

        let platform = "";
        if (options.platform !== "publish") {
            platform = "_" + options.platform;
        }

        const zipFilename = `${bannerName}${bannerSize}${platform}_${config.version}.zip`;
        const zipPath = path.resolve(distPath, zipFilename);

        const zip = new Zip();
        const files = await fs.readdir(buildPath);
        files.forEach(filename => {
            const filePath = path.resolve(buildPath, filename);
            zip.addLocalFile(filePath);
        });
        zip.writeZip(zipPath);
        const { size } = await fs.stat(zipPath);
        console.log(`Generated ${zipPath} (${formatBytes(size)})`);

        return {
            ok: true,
            archiveFilename: path.basename(zipPath)
        };
    }
}

module.exports = build;
