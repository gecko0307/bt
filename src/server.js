const path = require("path");
const Fastify = require("fastify");
const fastifyStatic = require("fastify-static");
const api = require("./api");

const cwd = process.cwd();

const fastify = Fastify({
});

fastify.post("/api", api.handleRequest);

fastify.register(fastifyStatic, {
    root: path.join(cwd, "HTML")
});

fastify.register(fastifyStatic, {
    root: path.join(__dirname, "..", "static", "preview"),
    prefix: "/preview",
    redirect: true,
    decorateReply: false
});

fastify.register(fastifyStatic, {
    root: path.join(__dirname, "..", "static", "fonts"),
    prefix: "/fonts",
    redirect: true,
    decorateReply: false
});

fastify.register(fastifyStatic, {
    root: path.join(__dirname, "..", "static", "images"),
    prefix: "/images",
    redirect: true,
    decorateReply: false
});

fastify.register(fastifyStatic, {
    root: path.join(__dirname, "..", "static", "mobile"),
    prefix: "/mobile",
    redirect: true,
    decorateReply: false
});

const routes = {
    "api": "http://localhost:9000/api",
    "preview": "http://localhost:9000/preview",
    "fonts": "http://localhost:9000/fonts",
    "images": "http://localhost:9000/images",
    "mobile": "http://localhost:9000/mobile?url=/index.html"
};

async function listen() {
    await fastify.listen(9000);
}

module.exports = {
    routes,
    listen
};
