import resolve from "@rollup/plugin-node-resolve";
import sass from "rollup-plugin-sass";
import autoprefixer from "autoprefixer";
import postcss from "postcss";
import dev from "rollup-plugin-dev";
import livereload from "rollup-plugin-livereload";
import { bundleReplace, cssAnimation } from "./rollup.plugins";
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
                .process(css)
                .then(result => result.css)
        }),
        cssAnimation({ always: true }),
        dev({
            dirs: ["HTML"],
            host: "localhost",
            port: 8000,
            onListen: function(server) {
                console.log("Good luck!");
            },
            proxy: [
                { from: "/api", to: utilServer.routes["api"] },
                { from: "/fonts", to: utilServer.routes["fonts"] },
                { from: "/images", to: utilServer.routes["images"] },
                { from: "/tuner", to: utilServer.routes["images"] }, // Banny Tools compatibility
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
