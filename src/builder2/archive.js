const fs = require("fs-extra");
const path = require("path");
const Zip = require("adm-zip");

async function archive(platformId, config, banner) {
    const w = banner.width.replace(/%/g, "P");
    const h = banner.height.replace(/%/g, "P");
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
    if (platformId !== "publish") {
        platform = "_" + platformId;
    }

    const zipFilename = `${bannerName}${bannerSize}${platform}_${config.version}.zip`;

    const outputPath = path.resolve("./build");

    const zip = new Zip();
    const files = await fs.readdir(outputPath);
    files.forEach(filename => {
        const filePath = path.resolve(`./build/${filename}`);
        zip.addLocalFile(filePath);
    });
    const zipPath = path.resolve(`./dist/${zipFilename}`);
    zip.writeZip(zipPath);

    return zipPath;
}

module.exports = archive;
