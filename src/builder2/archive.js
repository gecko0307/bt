const fs = require("fs-extra");
const path = require("path");
const Zip = require("adm-zip");

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

async function archive(tr, platformId, config, banner, fallbackPath = "") {
    const w = banner.width.replace(/%/g, "P");
    const h = banner.height.replace(/%/g, "P");
    let bannerSize = `${w}x${h}`;
    if (config.size) {
        bannerSize = config.size;
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
    bannerName += "_";

    let platform = "";
    if (platformId !== "publish") {
        platform = "_" + platformId;
    }

    const outputPath = path.resolve("./build");

    const zip = new Zip();
    const files = await fs.readdir(outputPath);
    files.forEach(filename => {
        const filePath = path.resolve(`./build/${filename}`);
        zip.addLocalFile(filePath);
    });

    const zipFilename = `${bannerName}${bannerSize}${platform}_${config.version}.zip`;
    const zipPath = path.resolve(`./dist/${zipFilename}`);
    let zipInternalPath = zipPath;

    if (fallbackPath.length > 0) {
        const zipInternalFilename = `${bannerSize}${platform}_${config.version}.zip`;
        zipInternalPath = path.resolve(`./dist/${zipInternalFilename}`);
        zip.writeZip(zipInternalPath);
        const zip2 = new Zip();
        zip2.addLocalFile(zipInternalPath);
        zip2.addLocalFile(fallbackPath);
        zip2.writeZip(zipPath);
    }
    else {
        zip.writeZip(zipInternalPath);
    }

    const { size } = await fs.stat(zipInternalPath);
    const sizeKb = (size / 1024).toFixed(2);
    let color = "\x1b[1m\x1b[32m";
    if (tr.dist.maxSize > 0) {
        color = (sizeKb >= tr.dist.maxSize)? "\x1b[1m\x1b[31m" : "\x1b[1m\x1b[32m"; // Red if too large, green if ok
    }
    const sizeStr = `${color}${formatBytes(size)}\x1b[0m`;
    console.log(`Generated ${path.basename(zipInternalPath)} (${sizeStr})`);
    if (tr.dist.maxSize > 0 && sizeKb >= tr.dist.maxSize) {
        console.log(`\x1b[1m\x1b[31mWarning: archive size exceeds maximum allowed by the specified platform (${tr.dist.maxSize} KB)\x1b[0m`);
    }

    if (fallbackPath.length > 0) {
        // TODO: check fallback size
        const { size } = await fs.stat(fallbackPath);
        const fallbackSizeStr = formatBytes(size);
        console.log(`Fallback ${path.basename(fallbackPath)} (${fallbackSizeStr})`);
        console.log(`Generated ${path.basename(zipPath)}`);
    }

    return zipPath;
}

module.exports = archive;
