const fontGen = require("./font-generator");

const methods = {
    "fontsList": fontGen.fontsList
};

async function handleRequest(request, reply) {
    if (request.body) {
        const body = JSON.parse(request.body);
        const method = body.method;
        if (method) {
            if (method in methods) {
                const data = await methods[method](body);
                return reply.send({ ok: true, message: "", data: data });
            }
            else return reply.send({ ok: false, message: `Unknown method "${method}"` });
        }
        else return reply.send({ ok: false, message: "No API method given" });
    }
    else return reply.send({ ok: false, message: "No request body" });
}

module.exports = {
    handleRequest
};
