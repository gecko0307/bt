const fs = require("fs-extra"); 
const path = require("path");
const { EventEmitter, on } = require("events");
const Fastify = require("fastify");
const fastifyStatic = require("fastify-static");
const chokidar = require("chokidar");
const mime = require("mime");
const api = require("./api");

const cwd = process.cwd();

const eventEmitter = new EventEmitter();
const eventListeners = {
    watcher: on(eventEmitter, "watcher")
};

const fastify = Fastify({});
fastify.register(require("fastify-sse-v2"), { retryDelay: 1000 });

fastify.get("/favicon.ico", function(request, reply) {
    return reply.sendFile(path.join(__dirname, "..", "static", "server_data", "favicon.ico"));
});

// Banner project's HTML directory
fastify.register(fastifyStatic, {
    root: path.join(cwd, "HTML")
});

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

// API handler
fastify.post("/api", api.handleRequest);

// SSE interface for server events
// Example: /sse?events=watcher
fastify.get("/sse", function(request, reply) {
    const eventName = request.query.events;
    if (!(eventName in eventListeners)) {
        reply.code(400).send(new Error("Invalid event listener"));
    }
    else {
        const listener = eventListeners[eventName];
        reply.sse((async function* source() {
            for await (const event of listener) {
                yield { event: event.name, data: JSON.stringify(event[0])};
            }
        })());
    }
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
    root: path.join(__dirname, "..", "static", "images", "public"),
    prefix: "/tuner",
    redirect: true,
    decorateReply: false
});

fastify.register(fastifyStatic, {
    root: path.join(__dirname, "..", "static", "mobile"),
    prefix: "/mobile",
    redirect: true,
    decorateReply: false
});

//

const watcherFonts = chokidar.watch(path.join(cwd, "Fonts"));
watcherFonts.on("all", async (event, path) => {
    if (["add", "change", "unlink"].includes(event)) {
        await api.update("fonts", event, path);
        eventEmitter.emit("watcher", { subsystem: "fonts", event: event, path: path });
    }
});

const watcherImages = chokidar.watch(path.join(cwd, "Images"));
watcherImages.on("all", async (event, path) => {
    console.log(event);
    if (["add", "change", "unlink"].includes(event)) {
        await api.update("images", event, path);
        eventEmitter.emit("watcher", { subsystem: "images", event: event, path: path });
    }
});

async function listen(options) {
    api.init();
    await fastify.listen(8000);
    console.log("Listening on http://localhost:8000/");
    if (options.onListen) options.onListen(fastify);
}

module.exports = {
    listen
};
