const fs = require("fs-extra");
const path = require("path");
const Zip = require("adm-zip");
const chalk = require("chalk");

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

async function archive(log, root, tr, platformId, config, banner, fallbackPath = "") {
    const w = banner.width.replace(/%/g, "P");
    const h = banner.height.replace(/%/g, "P");
    let bannerSize = "";
    if (config.size) {
        bannerSize = config.size;
    }
    else if (w != "0" && h != "0") {
        bannerSize = `${w}x${h}`;
    }
    if (bannerSize.length > 0)
        bannerSize += "_";

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
        platform = platformId + "_";
    }

    const outputPath = path.resolve(root, "./build");

    const zip = new Zip();
    const files = await fs.readdir(outputPath);
    files.forEach(filename => {
        const filePath = path.resolve(root, `./build/${filename}`);
        zip.addLocalFile(filePath);
    });

    const zipFilename = `${bannerName}${bannerSize}${platform}${config.version}.zip`;
    const zipPath = path.resolve(root, `./dist/${zipFilename}`);
    let zipInternalPath = zipPath;

    if (fallbackPath.length > 0) {
        const zipInternalFilename = `${bannerSize}${platform}_${config.version}.zip`;
        zipInternalPath = path.resolve(root, `./dist/${zipInternalFilename}`);
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
    let color = chalk.greenBright;
    if (tr.dist.maxSize > 0 && sizeKb >= tr.dist.maxSize) {
        color = chalk.redBright;
    }
    const sizeStr = color(`${formatBytes(size)}\x1b[0m`);
    log.info(`Generated ${path.basename(zipInternalPath)} (${sizeStr})`);
    if (tr.dist.maxSize > 0 && sizeKb >= tr.dist.maxSize) {
        log.warn(`Warning: archive size exceeds maximum allowed by the specified platform (${tr.dist.maxSize} KB)`);
    }

    if (fallbackPath.length > 0) {
        // TODO: check fallback size
        const { size } = await fs.stat(fallbackPath);
        const fallbackSizeStr = formatBytes(size);
        log.info(`Fallback ${path.basename(fallbackPath)} (${fallbackSizeStr})`);
        log.info(`Generated ${path.basename(zipPath)}`);
    }

    return zipPath;
}

module.exports = archive;
