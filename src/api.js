const fontGenerator = require("./font-generator");
const imageOptimizer = require("./image-optimizer");
const capturer = require("./capturer");

async function capture(req = {}) {
    const frames = await capturer(req);
    return {
        ok: true,
        message: "",
        frames: frames
    }
}

const methods = {
    "fontsList": fontGenerator.fontsList,
    "fontsConfig": fontGenerator.fontsConfig,
    "generateFonts": fontGenerator.generateFonts,
    
    "imagesList": imageOptimizer.imagesList,
    "imagesConfig": imageOptimizer.imagesConfig,
    "optimizeImages": imageOptimizer.optimizeImages,
    
    "capture": capture
};

async function init() {
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
