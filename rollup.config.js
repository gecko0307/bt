import serve from "rollup-plugin-serve";
 
export default
{
    input: "banners/300x300/main.js",
    
    output: {
        file: "banners/300x300/bundle.js",
        format: "iife"
    },
    
    plugins: [
        serve("banners/300x300")
    ]
}