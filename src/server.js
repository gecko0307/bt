const fs = require("fs-extra"); 
const path = require("path");
const { EventEmitter } = require("events");
const { EventIterator } = require("event-iterator");
const Fastify = require("fastify");
const fastifyStatic = require("fastify-static");
const livereload = require("livereload");
const chokidar = require("chokidar");
const mime = require("mime");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const api = require("./api");

const cwd = process.cwd();

const serverConfigPath = path.join(cwd, ".data", "server.config.json");

const defaultServerConfig = {
	startPath: "/"
};

let serverConfig = defaultServerConfig;

if (fs.existsSync(serverConfigPath)) {
    serverConfig = fs.readJSONSync(serverConfigPath, { throws: false }) || defaultServerConfig;
}

const port = 8000;
const baseUrl = "http://localhost:8000";
const url = baseUrl + serverConfig.startPath || "/";

let eventEmitter;
let watcherFonts;
let watcherImages;
let watcherShaders;
let fastify;
let livereloadServer;

function init() {
    eventEmitter = new EventEmitter();
    
    livereloadServer = livereload.createServer();

    fastify = Fastify({});
    fastify.register(require("fastify-sse-v2"), { retryDelay: 1000 });

    // Banner project's HTML directory
    fastify.register(fastifyStatic, {
        root: path.join(cwd, "HTML")
    });
    
    async function serveIndexFile(req, reply) {
        const indexFilePath = path.resolve("./HTML/index.html");
        const html = await fs.readFile(indexFilePath);
        const dom = new JSDOM(html);
        const document = dom.window.document;
        const body = document.getElementsByTagName("body")[0];
        const script = document.createElement("script");
        script.setAttribute("src", "http://localhost:35729/livereload.js?snipver=1");
        body.insertBefore(script, body.firstChild);
        const htmlOutput = dom.serialize();
        return reply.type("text/html").send(htmlOutput);
    }
    
    fastify.get("/", serveIndexFile);
    fastify.get("/index.html", serveIndexFile);

    //  Banner project's build directory (builded banner)
    fastify.register(fastifyStatic, {
        root: path.join(cwd, "build"),
        prefix: "/build",
        redirect: true,
        decorateReply: false
    });
    
    // Favicon
    fastify.register(require("fastify-favicon"), {
        path: path.join(__dirname, "..", "static", "server_data"),
        name: "favicon.ico"
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
        // TODO: validate eventName

        reply.sse(new EventIterator(({push}) => {
            const cb = (data) => {
                const json = JSON.stringify(data);
                push({ data: json });
            };

            eventEmitter.on(eventName, cb);
                reply.raw.on("close", () => {
                    eventEmitter.removeListener(eventName, cb);
                });
                return () => eventEmitter.removeListener(eventName, cb);
            })
        );
    });
    
    fastify.register(fastifyStatic, {
        root: path.join(__dirname, "..", "static", "preview", "public"),
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

    watcherFonts = chokidar.watch(path.join(cwd, "Fonts"));
    watcherFonts.on("all", async (event, path) => {
        if (["add", "change", "unlink"].includes(event)) {
            await api.update("fonts", event, path);
            eventEmitter.emit("watcher", { subsystem: "fonts", event: event, path: path });
        }
    });

    watcherImages = chokidar.watch(path.join(cwd, "Images"));
    watcherImages.on("all", async (event, path) => {
        if (["add", "change", "unlink"].includes(event)) {
            await api.update("images", event, path);
            eventEmitter.emit("watcher", { subsystem: "images", event: event, path: path });
        }
    });
    
    watcherShaders = chokidar.watch(path.join(cwd, "Shaders"));
    watcherShaders.on("all", async (event, path) => {
        if (["add", "change", "unlink"].includes(event)) {
            await api.update("shaders", event, path);
            eventEmitter.emit("watcher", { subsystem: "shaders", event: event, path: path });
        }
    });
    
    api.init();
    
    return fastify;
}

async function listen(options) {
    await livereloadServer.watch(path.join(cwd, "HTML"));
    await fastify.listen(port);
    console.log("Listening on", baseUrl);
    if (options.onListen) options.onListen(fastify);
}

module.exports = {
    init,
    listen,
    url
};
