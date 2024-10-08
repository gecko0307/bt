const fs = require("fs-extra");
const path = require("path");

const publish = {
    id: "publish",
    name: "Unknown",
    type: "html",
    dist: {
        format: "zip",
        maxSize: 0
    },
    requiredFiles: ["index.html"],
    allowedFiles: ["*.*"],
    maxFilesNum: 0,
    indexFile: "index.html",
    externalLinks: true,
    fallback: {
        required: false
    },
    tags: {
    },
    attributes: {
        "#link": {
            target: "_blank"
        }
    },
    ids: {},
    inlineFiles: false,
    minify: true,
    browsers: {}
};

async function requirements(platformId) {
    let tr = publish;
    let platformName = tr.name;

    let specPath = path.join(__dirname, "..", "..", "specs", `${platformId}.json`);
    if (await fs.pathExists(specPath)) {
        tr = JSON.parse(await fs.readFile(specPath, "utf8"));
        platformName = tr.name;
    }
    else if (platformId in aliases) {
        const alias = aliases[platformId];
        specPath = path.join(__dirname, "..", "..", "specs", `${alias.tr}.json`);
        platformName = alias.name;
        if (await fs.pathExists(specPath)) {
            tr = JSON.parse(await fs.readFile(specPath, "utf8"));
        }
    }

    return { tr, platformName };
}

const aliases = {
    "7ya": { name: "7я.ру", tr: "adfox" },
    "adbro": { name: "ADBRO", tr: "publish" },
    "adsmart": { name: "AdSmart", tr: "publish" },
    "ads": { name: "Google Ads", tr: "adwords" },
    "adspector": { name: "AdSpector", tr: "soloway" },
    "advmaker": { name: "Advmaker", tr: "adwords" },
    "adw": { name: "AdWords", tr: "adwords" },
    "afisha": { name: "Афиша", tr: "rambler" },
    "astraone": { name: "AstraOne", tr: "publish" },
    "auto": { name: "Auto.ru", tr: "yandex" },
    "auto-package": { name: "Auto Package", tr: "adfox" },
    "alp": { name: "ALP", tr: "adfox" },
    "aod": { name: "AOD", tr: "dcm" },
    "avito": { name: "Avito", tr: "adfox" },
    "bazaar": { name: "Bazaar", tr: "womensnetwork" },
    "beeline": { name: "Beeline", tr: "yandex-direct" },
    "between": { name: "Between", tr: "publish" },
    "bfm": { name: "BFM", tr: "adfox" },
    "buro247": { name: "Buro247", tr: "adfox" },
    "cars": { name: "Cars", tr: "adriver" },
    "carsguru": { name: "CarsGuru", tr: "adriver" },
    "championat": { name: "Championat.ru", tr: "rambler" },
    "cian": { name: "Циан", tr: "adfox" },
    "cmpstar": { name: "CMPStar", tr: "publish" },
    "condenast": { name: "Condé Nast", tr: "dcm" },
    "display360": { name: "Display & Video 360", tr: "dcm" },
    "doubleclick": { name: "DoubleClick", tr: "dcm" },
    "doubleclick_studio": { name: "DoubleClick Studio", tr: "studio" },
    "drive": { name: "Drive.ru", tr: "adfox" },
    "dzen": { name: "Дзен", tr: "mail" },
    "eda": { name: "Eda.ru", tr: "rambler" },
    "esquire": { name: "Esquire", tr: "womensnetwork" },
    "exebid": { name: "Exebid", tr: "dca" },
    "exist": { name: "Exist", tr: "adfox" },
    "f1news": { name: "F1News.ru", tr: "adfox" },
    "ferra": { name: "Ferra.ru", tr: "rambler" },
    "forbes": { name: "Forbes", tr: "adfox" },
    "gazeta": { name: "Gazeta.ru", tr: "rambler" },
    "gastronom": { name: "Gastronom.ru", tr: "adfox" },
    "gdn": { name: "Google Display Network", tr: "adwords" },
    "gismeteo": { name: "Gismeteo", tr: "adfox" },
    "google": { name: "Google", tr: "adwords" },
    "gq": { name: "GQ", tr: "womensnetwork" },
    "grmi": { name: "GRMI", tr: "adriver" },
    "gumgum": { name: "GumGum", tr: "publish" },
    "hh": { name: "HeadHunter", tr: "publish" },
    "hsm": { name: "HSM", tr: "adrime" },
    "igromania": { name: "Игромания", tr: "adfox" },
    "imho": { name: "IMHO", tr: "adfox" },
    "incrussia": { name: "Inc. Russia", tr: "adfox" },
    "independent": { name: "The Independent", tr: "adrime" },
    "inosmi": { name: "InoSMI", tr: "adriver" },
    "interpool": { name: "MSA Interpool", tr: "adfox" },
    "gastronom": { name: "Гастроном", tr: "adfox" },
    "kinopoisk": { name: "Кинопоиск", tr: "yandex" },
    "kommersant": { name: "Коммерсантъ", tr: "adfox" },
    "kudago": { name: "KudaGo", tr: "adriver" },
    "lam": { name: "Look At Me", tr: "adfox" },
    "lenta": { name: "Lenta.ru", tr: "rambler" },
    "letidor": { name: "Letidor", tr: "rambler" },
    "live": { name: "Live", tr: "adfox" },
    "matchtv": { name: "Матч ТВ", tr: "adfox" },
    "mauto": { name: "Mauto", tr: "yandex" },
    "m24": { name: "Москва 24", tr: "adfox" },
    "meduza": { name: "Meduza", tr: "adrime" },
    "medvestnik": { name: "Медвестник", tr: "publish" },
    "megogo": { name: "MEGOGO", tr: "adfox" },
    "mhealth": { name: "Men's Health", tr: "bestseller" },
    "moscowtimes": { name: "Moscow Times", tr: "bestseller" },
    "moslenta": { name: "Мослента", tr: "rambler" },
    "motor": { name: "Motor.ru", tr: "rambler" },
    "motorpage": { name: "MotorPage", tr: "publish" },
    "mts": { name: "МТС", tr: "getintent" },
    "mytarget": { name: "MyTarget", tr: "mail" },
    "newstube": { name: "Newstube", tr: "adfox" },
    "nightparty": { name: "Nightparty", tr: "rambler" },
    "odnoklassniki": { name: "Одноклассники", tr: "mail" },
    "ok": { name: "Одноклассники", tr: "mail" },
    "ok_interactive": { name: "Одноклассники / интерактивный пост", tr: "vk" },
    "omd": { name: "OMD OM Group", tr: "dcm" },
    "passion": { name: "Passion", tr: "rambler" },
    "pmp": { name: "PMP", tr: "rambler" },
    "phd": { name: "PHD", tr: "dcm" },
    "pravo": { name: "Право.ру", tr: "dcm" },
    "price": { name: "Price.ru", tr: "rambler" },
    "redllama": { name: "Redllama", tr: "publish" },
    "ria": { name: "РИА Новости", tr: "adriver" },
    "run": { name: "Run", tr: "adrime" },
    "quto": { name: "Quto", tr: "rambler" },
    "redefine": { name: "Redefine", tr: "adfox" },
    "rg": { name: "Российская газета", tr: "adfox" },
    "rns": { name: "Rambler News Service", tr: "rambler" },
    "secretmag": { name: "Секрет фирмы", tr: "rambler" },
    "segmento": { name: "Segmento", tr: "dcm" },
    "segmento-dcm": { name: "Segmento", tr: "dcm" },
    "segmento-google": { name: "Segmento", tr: "dcm" },
    "segmento-yandex": { name: "Segmento", tr: "yandex" },
    "semya": { name: "Semya.ru", tr: "adfox" },
    "snob": { name: "Snob", tr: "adriver" },
    "sportbox": { name: "Sportbox.ru", tr: "adfox" },
    "sports": { name: "Sports.ru", tr: "adfox" },
    "studio": { name: "DoubleClick Studio", tr: "studio" },
    "tass": { name: "ТАСС", tr: "dcm" },
    "tatler": { name: "Tatler", tr: "adfox" },
    "timeout": { name: "Time Out", tr: "adfox" },
    "tjournal": { name: "TJ", tr: "adfox" },
    "top_business": { name: "TOP Business", tr: "adfox" },
    "tria": { name: "Tria", tr: "dca" },
    "tut": { name: "TUT", tr: "adfox" },
    "tutu": { name: "Tutu.ru", tr: "bestseller" },
    "vashdosug": { name: "Ваш Досуг", tr: "adriver" },
    "vedomosti": { name: "Ведомости", tr: "adfox" },
    "village": { name: "The Village", tr: "adfox" },
    "vc": { name: "vc.ru", tr: "adfox" },
    "wapstart": { name: "WapStart", tr: "studio" },
    "whrussia": { name: "Women's Health Russia", tr: "adriver" },
    "yandex-direct": { name: "Yandex Direct", tr: "yandex" },
    "yandex_direct": { name: "Yandex Direct", tr: "yandex" },
    "yandex_direct_main": { name: "Yandex Direct Главная", tr: "yandex" },
    "yandex_main": { name: "Yandex Главная", tr: "yandex" },
    "yandex_media": { name: "Yandex Media Services", tr: "yandex" },
    "yandex_soloway": { name: "Soloway Yandex SSP", tr: "yandex" },
    "youdo": { name: "YouDo", tr: "adfox" },
};

module.exports = { requirements };
