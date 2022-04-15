import resolve from "@rollup/plugin-node-resolve";
import sass from "rollup-plugin-sass";
import autoprefixer from "autoprefixer";
import postcss from "postcss";
import serve from "rollup-plugin-serve";
import livereload from "rollup-plugin-livereload";
import { bundleReplace /*, fonts, animation, eta*/ } from "./rollup.plugins";

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
        // TODO:
        //fonts(),
        //animation(),
        //eta(),
        sass({
            output: "HTML/bundle.css",
            processor: css => postcss([
                    autoprefixer
                ])
                .process(css)
                .then(result => result.css)
        }),
        serve({
            contentBase: ["HTML"],
            host: "localhost",
            port: 8000
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
