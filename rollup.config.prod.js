import resolve from "@rollup/plugin-node-resolve";
import strip from "@rollup/plugin-strip";
import babel from "@rollup/plugin-babel";
import sass from "rollup-plugin-sass";
import autoprefixer from "autoprefixer";
import postcss from "postcss";
import { bundleReplace /*, fonts, animation, eta*/ } from "./rollup.plugins";

const node_modules = __dirname + "/node_modules/";

export default {
    input: "src/banner.js",
    
    output: {
        file: "HTML/animation.js",
        format: "iife",
        name: "animation",
        indent: "\t",
        banner: "//#\n//# Сгенерировано, не лезь!\n//# Не вноси сюда никаких изменений!\n//#\n",
        sourcemap: false,
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
        strip({
            debugger: true
        }),
        babel({
            presets: [
                [node_modules + "@babel/preset-env", {
                    "modules": false
                }]
            ],
            plugins: [
                [node_modules + "@babel/plugin-transform-template-literals", { "loose": true }],
                [node_modules + "babel-plugin-remove-code", {
                    "function": [
                        "checkStops",
                        "tl.capture"
                    ],
                }]
            ],
            babelHelpers: "bundled",
            exclude: "node_modules/**",
            comments: true
        })
    ],
    
    context: "window",
    treeshake: {
        annotations: false,
        moduleSideEffects: "no-external",
    }
}
