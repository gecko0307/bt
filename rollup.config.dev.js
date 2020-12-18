import * as path from "path";
import * as fs from "fs";

import * as Eta from "eta";
import sass from "rollup-plugin-sass";
import autoprefixer from "autoprefixer";
import postcss from "postcss";
import serve from "rollup-plugin-serve";
import livereload from "rollup-plugin-livereload";

function requireUncached(module) {
    delete require.cache[require.resolve(module)];
    return require(module);
}

function eta(options = {}) {
    const etaIndex = path.resolve("./src/index.eta");
    const etaData = path.resolve("./src/index.eta.js");
    return {
        name: "watch-eta-files",
        async buildStart() {
            this.addWatchFile(etaIndex);
            this.addWatchFile(etaData);
        },

        writeBundle() {
            const dir = path.dirname(etaData);
            const data = requireUncached(etaData);
            const basename = path.basename(etaIndex, ".eta");
            const template = fs.readFileSync(etaIndex, "utf8");
            const html = Eta.render(template, data);
            const htmlFilename = path.join(dir, "..", basename + ".html");
            fs.writeFileSync(htmlFilename, html);
        }
    }
}
 
export default
{
    input: "src/main.js",
    
    output: {
        file: "bundle.js",
        format: "iife"
    },
    
    plugins: [
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
