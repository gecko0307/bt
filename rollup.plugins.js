import * as path from "path";
import * as fs from "fs";
import * as Eta from "eta";

const generateFonts = require("./src/webfontgen");
const { Timeline, generateAnimationStyle } = require("./src/animator");

Eta.configure({
    views: path.resolve("./src")
});

function requireUncached(module) {
    delete require.cache[require.resolve(module)];
    return require(module);
}

// TODO: update to work with Banny Tools projects
export function fonts(options = {}) {
    return {
        name: "compile-fonts",
        async buildStart() {
            this.addWatchFile(path.resolve("./.data/fonts.json"));
            
            if (options.always === true) {
                generateFonts();
            }
        },
        async watchChange(id, change) {
            if (id.endsWith("fonts.json")) {
                generateFonts();
            }
        },
        async writeBundle() {
            
        }
    }
}

// TODO: update to work with Banny Tools projects
export function animation(options = {}) {
    const animScript = path.resolve("./src/animation.css.js");
    
    function generateAnimationCSS() {
        const dir = path.dirname(animScript);
        const { timeline } = requireUncached(animScript);
        const tl = new Timeline();
        timeline(tl);
        const css = generateAnimationStyle(tl);
        const cssFilename = path.join(dir, "..", "animation.css");
        fs.writeFileSync(cssFilename, css);
    }
    
    return {
        name: "compile-animation",
        async buildStart() {
            this.addWatchFile(path.resolve("./src/animation.css.js"));
            
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

// TODO: update to work with Banny Tools projects
export function eta(options = {}) {
    const etaIndex = path.resolve("./src/index.eta");
    const etaData = path.resolve("./src/index.eta.js");
    
    function buildHTML() {
        const dir = path.dirname(etaData);
        const data = requireUncached(etaData);
        const basename = path.basename(etaIndex, ".eta");
        const template = fs.readFileSync(etaIndex, "utf8");
        const html = Eta.render(template, data);
        const htmlFilename = path.join(dir, "..", basename + ".html");
        fs.writeFileSync(htmlFilename, html);
    }
    
    return {
        name: "watch-eta-files",
        async buildStart() {
            this.addWatchFile(etaIndex);
            this.addWatchFile(etaData);
            
            if (options.always === true) {
                buildHTML();
            }
        },

        async writeBundle() {
            buildHTML();
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
