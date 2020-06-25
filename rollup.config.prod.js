import sass from "rollup-plugin-sass";
import autoprefixer from "autoprefixer";
import postcss from "postcss";
 
export default
{
    input: "banners/300x300/src/main.js",
    
    output: {
        file: "banners/300x300/bundle.js",
        format: "iife"
    },
    
    plugins: [
        sass({
            output: "banners/300x300/bundle.css",
            processor: css => postcss([autoprefixer])
                .process(css)
                .then(result => result.css)
        })
    ]
}
