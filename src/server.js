const path = require("path");
const Fastify = require("fastify");
const fastifyStatic = require("fastify-static");
const api = require("./api");

const fastify = Fastify();

fastify.get("/api", api.handleRequest);

fastify.register(fastifyStatic, {
    root: path.join(__dirname, "..", "static")
});

const routes = {
    "api": "http://localhost:9000/api",
    "preview": "http://localhost:9000/preview/",
    "fonts": "http://localhost:9000/fonts/",
    "images": "http://localhost:9000/images/"
};

async function listen() {
    await fastify.listen(9000);
}

module.exports = {
    routes,
    listen
};
