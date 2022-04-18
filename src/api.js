const fontGen = require("./font-generator");
const imageOpt = require("./image-optimizer");
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
    "fontsList": fontGen.fontsList,
    "fontsConfig": fontGen.fontsConfig,
    "generateFonts": fontGen.generateFonts,
    
    "imagesConfig": imageOpt.imagesConfig,
    "optimizeImages": imageOpt.optimizeImages,
    
    "capture": capture
};

async function init() {
    fontGen.init();
    imageOpt.init();
}

async function update(subsystem, event, path) {
    if (subsystem === "fonts") {
        fontGen.init();
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
