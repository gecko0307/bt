const fs = require("fs-extra");
const cheerio = require("cheerio");

async function update(html) {
    const $ = cheerio.load(html);
    const elements = $("[id]");
    const ids = [];
    elements.each(function(index) {
        ids.push($(this).attr("id"));
    });
    
    const cacheNew = ids.map(str => {
        return `id="${str}"`;
    }).join("\n");
    
    const cachePath = "./.data/.dom.cache";
    if (fs.exists(cachePath) === true) {
        const cache = await fs.readFile(cachePath, "utf8");
        if (cache === cacheNew) return;
    }
    
    const idConstants = ids.map(str => {
        return `export const ${str} = id("${str}");`;
    });
    
    const domModuleStr = `
// Сгенерировано, не лезь!

import { $, id } from "../helpers/selector";
export default $;

${idConstants.join("\n")}

		`.trim();
    
    await fs.writeFile("./src/main/dom.js", domModuleStr);
    await fs.writeFile(cachePath, cacheNew);
    console.info("src/main/dom.js updated");
}

module.exports = {
    update
};
