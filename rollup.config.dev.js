import sass from "rollup-plugin-sass";
import serve from "rollup-plugin-serve";
import livereload from "rollup-plugin-livereload";

import autoprefixer from "autoprefixer";
import postcss from "postcss";
 
export default
{
    input: "src/main.js",
    
    output: {
        file: "bundle.js",
        format: "iife"
    },
    
    plugins: [
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
