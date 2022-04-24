const fs = require("fs-extra");
const path = require("path");
const Zip = require("adm-zip");
const { execute } = require("../utils");

const cwd = process.cwd();

const platforms = {
    "7ya": { name: "7ya", tr: "adfox" },
    "adbro": { name: "Adbro", tr: "publish" },
    "adform": { name: "Adform", tr: "adform" },
    "adfox": { name: "Adfox", tr: "adfox" },
    "admitad": { name: "Admitad", tr: "admitad" },
    "adsmart": { name: "AdSmart", tr: "publish" },
    "adrime": { name: "Adrime", tr: "adrime" },
    "adriver": { name: "Adriver", tr: "adriver" },
    "advmaker": { name: "Advmaker", tr: "adwords" },
    "adwords": { name: "Adwords", tr: "adwords" },
    "afisha": { name: "Afisha", tr: "rambler" },
    "astraone": { name: "AstraOne", tr: "publish" },
    "auto": { name: "Auto", tr: "yandex" },
    "auto-package": { name: "Auto Package", tr: "adfox" },
    "alp": { name: "Alp", tr: "adfox" },
    "aod": { name: "AOD", tr: "dcm" },
    "avito": { name: "Avito", tr: "adfox" },
    "beeline": { name: "Beeline", tr: "yandex-direct" },
    "bestseller": { name: "Bestseller", tr: "bestseller" },
    "between": { name: "Between", tr: "publish" },
    "bfm": { name: "BFM", tr: "adfox" },
    "buro247": { name: "Buro247", tr: "adfox" },
    "cars": { name: "Cars", tr: "adriver" },
    "carsguru": { name: "CarsGuru", tr: "adriver" },
    "championat": { name: "Championat.ru", tr: "rambler" },
    "cityads": { name: "CityAds", tr: "cityads" },
    "cmpstar": { name: "CMPStar", tr: "publish" },
    "condenast": { name: "Condenast", tr: "dcm" },
    "dcm": { name: "DCM", tr: "dcm" },
    "display360": { name: "Display & Video 360", tr: "dcm" },
    "doubleclick": { name: "Doubleclick", tr: "dcm" },
    "doubleclick_studio": { name: "Doubleclick Studio", tr: "studio" },
    "drive": { name: "Drive.ru", tr: "adfox" },
    "dca": { name: "DCA", tr: "dca" },
    "eda": { name: "Eda", tr: "Rambler" },
    "esquire": { name: "Esquire", tr: "womensnetwork" },
    "exebid": { name: "Exebid", tr: "dca" },
    "exist": { name: "Exist", tr: "adfox" },
    "f1news": { name: "F1news", tr: "adfox" },
    "ferra": { name: "Ferra", tr: "rambler" },
    "forbes": { name: "Forbes", tr: "adfox" },
    "gazeta": { name: "Gazeta.ru", tr: "rambler" },
    "gastronom": { name: "Gastronom.ru", tr: "adfox" },
    "gdn": { name: "GDN", tr: "adwords" },
    "getintent": { name: "Getintent", tr: "getintent" },
    "gismeteo": { name: "Gismeteo", tr: "adfox" },
    "google": { name: "Google", tr: "adwords" },
    "gq": { name: "GQ", tr: "womensnetwork" },
    "grmi": { name: "GRMI", tr: "adriver" },
    "gumgum": { name: "GumGum", tr: "publish" },
    "hh": { name: "HeadHunter", tr: "publish" },
    "hsm": { name: "HSM", tr: "adrime" },
    "igromania": { name: "Игромания", tr: "adfox" },
    "incrussia": { name: "Inc. Russia", tr: "adfox" },
    "independent": { name: "The Independent", tr: "adrime" },
    "inosmi": { name: "InoSMI", tr: "adriver" },
    "interpool": { name: "Interpool", tr: "adfox" },
    "gastronom": { name: "Гастроном", tr: "adfox" },
    "kinopoisk": { name: "Кинопоиск", tr: "yandex" },
    "kommersant": { name: "Коммерсантъ", tr: "adfox" },
    "kudago": { name: "KudaGo", tr: "adriver" },
    "lam": { name: "Look At Me", tr: "adfox" },
    "lenta": { name: "Lenta.ru", tr: "rambler" },
    "letidor": { name: "Letidor", tr: "rambler" },
    "live": { name: "Live", tr: "adfox" },
    "mail": { name: "Mail.ru", tr: "mail" },
    "matchtv": { name: "Матч ТВ", tr: "adfox" },
    "mauto": { name: "MAuto", tr: "yandex" },
    "m24": { name: "Москва 24", tr: "adfox" },
    "meduza": { name: "Meduza", tr: "adrime" },
    "medvestnik": { name: "Медвестник", tr: "publish" },
    "megogo": { name: "MEGOGO", tr: "adfox" },
    "mhealth": { name: "Men's Health", tr: "bestseller" },
    "moscowtimes": { name: "Moscow Times", tr: "bestseller" },
    "moslenta": { name: "moslenta", tr: "rambler" },
    "motor": { name: "Motor.ru", tr: "rambler" },
    "motorpage": { name: "Motorpage", tr: "publish" },
    "mts": { name: "МТС", tr: "getintent" },
    "mytarget": { name: "MyTarget", tr: "mytarget" },
    "nativeroll": { name: "Nativeroll", tr: "nativeroll" },
    "newstube": { name: "Newstube", tr: "adfox" },
    "nightparty": { name: "Nightparty", tr: "rambler" },
    "odnoklassniki": { name: "Одноклассники", tr: "mail" },
    "ok": { name: "Одноклассники", tr: "mail" },
    "otm": { name: "OTM", tr: "otm" },
    "passion": { name: "Passion", tr: "rambler" },
    "pmp": { name: "PMP", tr: "rambler" },
    "phd": { name: "PHD", tr: "dcm" },
    "pravo": { name: "Pravo", tr: "dcm" },
    "price": { name: "Price", tr: "rambler" },
    "rbc": { name: "РБК", tr: "rbc" },
    "redllama": { name: "Redllama", tr: "publish" },
    "ria": { name: "РИА Новости", tr: "adriver" },
    "run": { name: "Run", tr: "adrime" },
    "quto": { name: "Quto", tr: "rambler" },
    "rambler": { name: "Rambler", tr: "rambler" },
    "redefine": { name: "Redefine", tr: "adfox" },
    "rg": { name: "Российская газета", tr: "adfox" },
    "rns": { name: "Rambler News Service", tr: "rambler" },
    "secretmag": { name: "Секрет фирмы", tr: "rambler" },
    "segmento": { name: "Segmento", tr: "dcm" },
    "segmento-dcm": { name: "Segmento", tr: "dcm" },
    "segmento-google": { name: "Segmento", tr: "dcm" },
    "segmento-yandex": { name: "Segmento", tr: "yandex" },
    "semya": { name: "Semya.ru", tr: "adfox" },
    "sizmek": { name: "Sizmek", tr: "sizmek" },
    "snob": { name: "Snob", tr: "adriver" },
    "soloway": { name: "Soloway", tr: "soloway" },
    "sportbox": { name: "Sportbox.ru", tr: "adfox" },
    "sports": { name: "Sports.ru", tr: "adfox" },
    "studio": { name: "Doubleclick Studio", tr: "studio" },
    "tass": { name: "ТАСС", tr: "dcm" },
    "tatler": { name: "Tatler", tr: "adfox" },
    "timeout": { name: "Time Out", tr: "adfox" },
    "top_business": { name: "TOP Business", tr: "adfox" },
    "tria": { name: "Tria", tr: "dca" },
    "tut": { name: "TUT", tr: "adfox" },
    "tutu": { name: "Tutu.ru", tr: "bestseller" },
    "vashdosug": { name: "VashDosug", tr: "adriver" },
    "vedomosti": { name: "Ведомости", tr: "adfox" },
    "village": { name: "The Village", tr: "adfox" },
    "vk": { name: "VK", tr: "publish" },
    "wapstart": { name: "WapStart", tr: "studio" },
    "weborama": { name: "Weborama", tr: "weborama" },
    "whrussia": { name: "WhRussia", tr: "adriver" },
    "wifi": { name: "WiFi", tr: "publish" },
    "wifi_branding": { name: "WiFi Branding", tr: "publish" },
    "womensnetwork": { name: "Women's Network", tr: "womensnetwork" },
    "yandex": { name: "Yandex", tr: "yandex" },
    "yandex_direct": { name: "Yandex Direct", tr: "yandex-direct" },
    "yandex_direct_main": { name: "Yandex Direct Главная", tr: "yandex-direct" },
    "yandex_main": { name: "Yandex Главная", tr: "yandex" },
    "yandex_media": { name: "Yandex Media Services", tr: "yandex" },
    "yandex_soloway": { name: "Soloway Yandex SSP", tr: "yandex" },
    "youdo": { name: "YouDo", tr: "adfox" },
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

async function runRollup(rollupConfig, options = []) {
    const rollup = path.join(__dirname, "..", "..", "node_modules", ".bin", "rollup");
    const rollupConfigPath = path.join(__dirname, "..", "..", rollupConfig);
    const code = await execute(rollup, ["-c", rollupConfigPath, ...options]);
    return code;
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
