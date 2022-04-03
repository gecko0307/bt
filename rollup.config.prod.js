import strip from "@rollup/plugin-strip";
import sass from "rollup-plugin-sass";
import autoprefixer from "autoprefixer";
import postcss from "postcss";
import url from "postcss-url";
import { fonts, animation, eta } from "./rollup.plugins";

// TODO: use options from bt.json
const urlOptions = {
    url: "inline", // "copy"
    encodeType: "base64",
    // maxSize: 5,
    // fallback: "copy",
    // basePath: "images",
    // assetsPath: "dist",
};
 
export default {
    input: "src/main.js",
    
    output: {
        file: "bundle.js",
        format: "iife"
    },
    
    plugins: [
        fonts({ always: true }),
        animation({ always: true }),
        eta({ always: true }),
        strip({
            debugger: true
        }),
        sass({
            output: "bundle.css",
            processor: css => postcss([autoprefixer])
                .use(url(urlOptions))
                .process(css)
                .then(result => result.css)
        })
    ]
}
