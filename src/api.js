const fs = require("fs-extra");
const path = require("path");
const fontGenerator = require("./font-generator");
const imageOptimizer = require("./image-optimizer");
const capturer = require("./capturer");
const builder = require("./builder");
const builder2 = require("./builder2");

function requireUncached(module) {
    delete require.cache[require.resolve(module)];
    return require(module);
}

const btConfigPath = path.join(__dirname, "..", "config.json");

async function capture(req = {}) {
    const frames = await capturer(req);
    return {
        ok: true,
        message: "",
        frames: frames
    }
}

async function build(req = {}) {
    let useGulpBuilder = false;
    let builderPath = "";

    console.log(req);

    const options = {
        brand: req.brand || "",
        campaign: req.campaign || "",
        creative: req.creative || "",
        platform: req.platform || "publish",
        version: req.version || "v1",
        size: req.size || ""
    };

    let btConfig = {};
    if (await fs.pathExists(btConfigPath)) {
        btConfig = requireUncached(btConfigPath) || {};
    }
    if ("builder" in btConfig) {
        useGulpBuilder = btConfig.builder.useGulpBuilder || (req.builder === "gulp") || false;
        builderPath = btConfig.builder.path || "";
    }

    let res;
    if (useGulpBuilder) {
        options.gulpBuilderPath = builderPath;
        res = await builder(options);
    }
    else {
        res = await builder2.build(options);
    }

    return {
        ok: res.ok || false,
        message: "",
        archiveFilename: res.archiveFilename
    }
}

const methods = {
    "fontsList": fontGenerator.fontsList,
    "fontsConfig": fontGenerator.fontsConfig,
    "generateFonts": fontGenerator.generateFonts,
    
    "imagesList": imageOptimizer.imagesList,
    "imagesConfig": imageOptimizer.imagesConfig,
    "optimizeImages": imageOptimizer.optimizeImages,
    
    "capture": capture,

    "buildConfig": builder2.buildConfig,
    "build": build
};

const dataPath = path.resolve("./.data");

async function init() {
    if (!(await fs.pathExists(dataPath))) {
        await fs.mkdir(dataPath);
    }
    fontGenerator.init();
    imageOptimizer.init();
}

async function update(subsystem, event, path) {
    if (subsystem === "fonts") {
        await fontGenerator.update();
    }
    else if (subsystem === "images") {
        await imageOptimizer.update();
    }
}

async function handleRequest(request, reply) {
    if (request.body) {
        const body = JSON.parse(request.body);
        const method = body.method;
        if (method) {
            if (method in methods) {
                const res = await methods[method](body);
                return reply.send(res);
            }
            else return reply.send({ ok: false, message: `Unknown method "${method}"` });
        }
        else return reply.send({ ok: false, message: "No API method given" });
    }
    else return reply.send({ ok: false, message: "No request body" });
}

module.exports = {
    init,
    update,
    handleRequest
};
