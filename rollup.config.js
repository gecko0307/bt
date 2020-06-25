import scss from "rollup-plugin-scss";
import serve from "rollup-plugin-serve";
 
export default
{
    input: "banners/300x300/main.js",
    
    output: {
        file: "banners/300x300/bundle.js",
        format: "iife"
    },
    
    plugins: [
        scss({
            output: "banners/300x300/bundle.css"
        }),
        serve({
            contentBase: ["banners"],
            host: "localhost",
            port: 8000
        })
    ]
}
