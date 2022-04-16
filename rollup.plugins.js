import * as path from "path";
import * as fs from "fs";

const { Timeline, generateAnimationStyle } = require("./src/css-animator");
const dom = require("./src/dom");

function requireUncached(module) {
    delete require.cache[require.resolve(module)];
    return require(module);
}

// TODO: add to Sass bundle instead of creating a separate file
export function cssAnimation(options = {}) {
    const animScript = path.resolve("./src/animation.css.js");
    
    function generateAnimationCSS() {
        if (fs.existsSync(animScript) === false)
            return;
        const dir = path.dirname(animScript);
        const { timeline } = requireUncached(animScript);
        const tl = new Timeline();
        timeline(tl);
        const css = generateAnimationStyle(tl);
        const cssFilename = path.resolve("./HTML/animation.css")
        fs.writeFileSync(cssFilename, css);
    }
    
    return {
        name: "compile-animation",
        async buildStart() {
            this.addWatchFile(animScript);
            
            if (options.always === true) {
                generateAnimationCSS();
            }
        },
        async watchChange(id, change) {
            if (id.endsWith("animation.css.js")) {
                generateAnimationCSS();
            }
        },
        async writeBundle() {
            
        }
    }
}

export function domIntrospection(options = {}) {
    const indexFile = path.resolve("./HTML/index.html");
    
    async function domProcess() {
        if (fs.existsSync(indexFile) === false)
            return;
        const html = fs.readFileSync(indexFile, { encoding: "utf8" });
        dom.update(html);
    }
    
    return {
        name: "dom-introspection",
        async buildStart() {
            this.addWatchFile(indexFile);
            
            if (options.always === true) {
                domProcess();
            }
        },
        async watchChange(id, change) {
            if (id.endsWith("index.html")) {
                await domProcess();
            }
        },
        async writeBundle() {
            
        }
    }
}

export function bundleReplace(options = {}) {
    return {
        generateBundle(outputOptions, bundle, isWrite) {
            let code = bundle["animation.js"].code;
            for (const r in options.replace) {
                const repl = options.replace[r];
                code = code.replace(repl[0], repl[1]);
            }
            if (options.transform) code = options.transform(code);
            bundle["animation.js"].code = code;
        }
    };
}
