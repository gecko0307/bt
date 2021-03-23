import * as path from "path";
import * as fs from "fs";
import * as Eta from "eta";

const generateFonts = require("./src/webfontgen");
const { generateAnimationStyle } = require("./src/animator");

Eta.configure({
    views: path.resolve("./src")
})


function requireUncached(module) {
    delete require.cache[require.resolve(module)];
    return require(module);
}

export function fonts(options = {}) {
    return {
        name: "compile-fonts",
        async buildStart() {
            this.addWatchFile(path.resolve("./src/fonts.json"));
            
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

export function animation(options = {}) {
    const animScript = path.resolve("./src/animation.css.js");
    
    function generateAnimationCSS() {
        const dir = path.dirname(animScript);
        const { timeline } = requireUncached(animScript);
        const tl = timeline();
        console.log(tl);
        
        const css = generateAnimationStyle(tl);
        const cssFilename = path.join(dir, "..", "animation.css");
        fs.writeFileSync(cssFilename, css);
        
        //const basename = path.basename(etaIndex, ".eta");
        //const template = fs.readFileSync(etaIndex, "utf8");
        //const html = Eta.render(template, data);
        //const htmlFilename = path.join(dir, "..", basename + ".html");
        //fs.writeFileSync(htmlFilename, html);
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
