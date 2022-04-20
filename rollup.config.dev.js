import resolve from "@rollup/plugin-node-resolve";
import sass from "rollup-plugin-sass";
import autoprefixer from "autoprefixer";
import postcss from "postcss";
import dev from "rollup-plugin-dev";
import livereload from "rollup-plugin-livereload";
import { bundleReplace, cssAnimation, domIntrospection } from "./rollup.plugins";
import opener from "opener";

const utilServer = require("./src/server");

export default {
    input: "src/banner.js",
    
    output: {
        file: "HTML/animation.js",
        format: "iife",
        name: "animation",
        indent: "\t",
        banner: "//#\n//# Сгенерировано, не лезь!\n//# Не вноси сюда никаких изменений!\n//#\n",
        sourcemap: true,
    },
    
    plugins: [
        resolve({ browser: true }),
        bundleReplace({
            replace: [
                [/animation\s*\=\s*\(function\s*\(\)\s*\{/, "animation = (function(window, document, gsap, undefined){"],
                [/\}(?:\)\(\)|\(\)\));\s*$/, "})(window, window.document, window.gsap);"],
                [/ {3}/g, "\t"]
            ]
        }),
        sass({
            output: "HTML/bundle.css",
            processor: css => postcss([
                    autoprefixer
                ])
                .process(css, { from: undefined })
                .then(result => result.css)
        }),
        cssAnimation({ always: true }),
        domIntrospection({ always: true }),
        dev({
            silent: true,
            dirs: ["HTML"],
            host: "localhost",
            port: 8000,
            onListen: function(server) {
                const url = "http://localhost:8000/";
                console.log("Listening on", url);
                opener(url);
                console.log("Good luck!");
            },
            proxy: [
                { from: "/favicon.ico", to: utilServer.routes["favicon"] },
                { from: "/file", to: utilServer.routes["file"] },
                { from: "/api", to: utilServer.routes["api"] },
                { from: "/preview", to: utilServer.routes["preview"] },
                { from: "/fonts", to: utilServer.routes["fonts"] },
                { from: "/images", to: utilServer.routes["images"] },
                { from: "/tuner", to: utilServer.routes["images"] }, // Banny Tools compatibility
                { from: "/mobile", to: utilServer.routes["mobile"] },
                { from: "/capture", to: utilServer.routes["capture"] },
            ]
        }),
        livereload({
            watch: "HTML",
        })
    ],
    
    context: "window",
    treeshake: {
        annotations: false,
        moduleSideEffects: "no-external",
    }
}

utilServer.listen();
