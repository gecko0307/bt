import strip from "@rollup/plugin-strip";
import sass from "rollup-plugin-sass";
import autoprefixer from "autoprefixer";
import postcss from "postcss";
import { fonts, animation, eta } from "./rollup.plugins";
 
export default
{
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
                .process(css)
                .then(result => result.css)
        })
    ]
}
