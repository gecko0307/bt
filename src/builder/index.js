const fs = require("fs-extra");
const path = require("path");
const Zip = require("adm-zip");
const { execute } = require("../utils");
const platforms = require("./platforms");
const runRollup = require("../rollup");

const cwd = process.cwd();

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

async function build(options = { platform: "publish", version: "v1" }) {
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
    console.log("Version:", options.version);
    const code = await runRollup("rollup.config.prod.js");
    if (code === 0) {
        const inputPath = path.join(cwd, "HTML");
        const outputPath = path.join(cwd, "build");
        // TODO: make name from brand/campaign
        const zipFilename = `banner_${options.platform}_${options.version}.zip`;
        const zipPath = path.join(cwd, "dist", zipFilename);
        const builderPath = "E:/SmartHead/internal/builder/Gulp-builder_1.4";

        if (!(await fs.pathExists(builderPath))) {
            console.log("Builder not found!");
            return;
        }

        console.log("Using Gulp-builder 1.4");
        const builderCode = await execute("npm", 
            ["run", "gulp", "--", "--task", `"${options.platform}"`, "--input", `"${inputPath}/"`, "--output", `"${outputPath}/"`, "--skip"], 
            { cwd: builderPath }
        );
        if (builderCode !== 0) {
            console.log("Build failed!");
        }
        else {
            console.log("Build finished!");
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
