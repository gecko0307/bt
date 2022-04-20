const fs = require("fs-extra"); 
const path = require("path");
const Fastify = require("fastify");
const fastifyStatic = require("fastify-static");
const chokidar = require("chokidar");
const mime = require("mime");
const api = require("./api");

const cwd = process.cwd();

const fastify = Fastify({});

// Request any file relative to banner project root
fastify.route({ method: "GET", url: "/file",
    schema: {
        querystring: {
            path: { type: "string" }
        }
    },
    handler: async function(request, reply) {
        const filePath = request.query.path;
        const absoluteFilePath = path.resolve(`./${filePath}`);
        if (await fs.pathExists(absoluteFilePath)){
            const data = await fs.readFile(absoluteFilePath);
            const mimetype = mime.getType(absoluteFilePath);
            reply.type(mimetype).send(data);
        }
        else {
            reply.code(404).type("text/html").send("404 Not Found");
        }
    }
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
    root: path.join(__dirname, "..", "static", "fonts", "public"),
    prefix: "/fonts",
    redirect: true,
    decorateReply: false
});

fastify.register(fastifyStatic, {
    root: path.join(__dirname, "..", "static", "images", "public"),
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

fastify.register(fastifyStatic, {
    root: path.join(__dirname, "..", "static", "server_data"),
    prefix: "/server_data",
    redirect: true,
    decorateReply: false
});

fastify.register(fastifyStatic, {
    root: path.join(cwd, "capture"),
    prefix: "/capture",
    redirect: true,
    decorateReply: false
});

const routes = {
    "favicon": "http://localhost:9000/server_data/favicon.ico",
    "file": "http://localhost:9000/file",
    "api": "http://localhost:9000/api",
    "preview": "http://localhost:9000/preview",
    "fonts": "http://localhost:9000/fonts",
    "images": "http://localhost:9000/images",
    "mobile": "http://localhost:9000/mobile?url=/index.html",
    "capture": "http://localhost:9000/capture"
};

const watcher = chokidar.watch(path.join(cwd, "Fonts"));
watcher.on("all", (event, path) => {
    if (["add", "change", "unlink"].includes(event)) {
        api.update("fonts", event, path);
    }
});

async function listen() {
    api.init();
    await fastify.listen(9000);
}

module.exports = {
    routes,
    listen
};
