import sass from "rollup-plugin-sass";
import autoprefixer from "autoprefixer";
import postcss from "postcss";
import serve from "rollup-plugin-serve";
import livereload from "rollup-plugin-livereload";
import { fonts, eta } from "./rollup.plugins";

export default
{
    input: "src/main.js",
    
    output: {
        file: "bundle.js",
        format: "iife"
    },
    
    plugins: [
        fonts(),
        eta(),
        sass({
            output: "bundle.css",
            processor: css => postcss([autoprefixer])
                .process(css)
                .then(result => result.css)
        }),
        serve({
            contentBase: [""],
            host: "localhost",
            port: 8000
        }),
        livereload({
            watch: "",
        })
    ]
}
