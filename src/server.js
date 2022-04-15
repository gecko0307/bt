const path = require("path");
const Fastify = require("fastify");
const fastifyStatic = require("fastify-static");

const fastify = Fastify();

fastify.get("/api", async function(request, reply) {
    return reply.send({ data: "Hello, World!" });
});

fastify.register(fastifyStatic, {
    root: path.join(__dirname, "..", "static")
});

async function listen() {
    await fastify.listen(9000);
}

const routes = {
    "api": "http://localhost:9000/api",
    "fonts": "http://localhost:9000/fonts/",
    "images": "http://localhost:9000/images/"
};

module.exports = {
    listen,
    routes
};
