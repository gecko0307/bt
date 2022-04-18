const fontGen = require("./font-generator");
const capturer = require("./capturer");

async function capture(req = {}) {
    await capturer();
    return {
        ok: true,
        message: ""
    }
}

const methods = {
    "fontsList": fontGen.fontsList,
    "fontsConfig": fontGen.fontsConfig,
    "generateFonts": fontGen.generateFonts,
    "capture": capture
};

async function init() {
    fontGen.init();
}

async function update(subsystem, event, path) {
    if (subsystem === "fonts") {
        fontGen.init(); // Update fonts list
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
