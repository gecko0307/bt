const fs = require("fs-extra");
const cheerio = require("cheerio");

async function update(html) {
    const $ = cheerio.load(html);
    const elements = $("[id]");
    const ids = [];
    elements.each(function(index) {
        ids.push($(this).attr("id"));
    });
    
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
    console.info("src/main/dom.js updated");
}

module.exports = {
    update
};
