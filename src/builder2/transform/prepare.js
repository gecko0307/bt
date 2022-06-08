const fs = require("fs-extra");
const path = require("path");
const Mustache = require("mustache");

async function prepare(filename, document, tr, options) {
    const head = document.getElementsByTagName("head")[0];
    const body = document.getElementsByTagName("body")[0];

    const templateData = {
        banner: options.banner,
        load: function() {
            return function(filename, render) {
                console.log(filename);
                const filePath = path.join(__dirname, "..", "..", "..", "specs", filename);
                if (fs.pathExistsSync(filePath))
                    return fs.readFileSync(filePath, {encoding: "utf8", flag: "r"});
                else
                    return "";
            };
        }
    };

    function addTag(tag, rootElement) {
        let element;
        if (tag.tag === "comment") {
            const template = tag.text || "";
            const value = Mustache.render(template, templateData);
            element = document.createComment(value);
        }
        else if (tag.tag === "text") {
            const template = tag.text || "";
            const value = Mustache.render(template, templateData);
            element = document.createTextNode(value);
        }
        else {
            element = document.createElement(tag.tag);
            for (const name of Object.keys(tag.attributes)) {
                const template = tag.attributes[name];
                const value = Mustache.render(template, templateData);
                element.setAttribute(name, value);
            }
            if (tag.text) {
                const template = tag.text;
                const value = Mustache.render(template, templateData);
                element.innerHTML = value;
            }
        }

        let conditionsMet = true;
        // TODO: multiple conditions
        if (tag.condition !== undefined) {
            if (tag.condition === "responsive" && options.banner.isResponsive !== true)
                conditionsMet = false;
        }

        if (conditionsMet) {
            if (tag.insert === "start") {
                rootElement.insertBefore(element, rootElement.firstChild);
                rootElement.insertBefore(document.createTextNode("\r\n\t"), rootElement.firstChild);
            }
            else if (tag.insert === "root") {
                element.innerHTML = rootElement.innerHTML;
                rootElement.innerHTML = "";
                rootElement.appendChild(element);
            }
            else {
                rootElement.appendChild(element);
                rootElement.appendChild(document.createTextNode("\r\n"));
            }
        }
    }

    if ("head" in tr.tags) {
        head.appendChild(document.createTextNode("\r\n"));
        for (const tag of tr.tags.head) {
            addTag(tag, head);
        }
    }

    if ("body" in tr.tags) {
        body.appendChild(document.createTextNode("\r\n"));
        for (const tag of tr.tags.body) {
            addTag(tag, body);
        }
    }

    if ("attributes" in tr) {
        for (const selector of Object.keys(tr.attributes)) {
            const attributes = tr.attributes[selector];
            for (const element of document.querySelectorAll(selector)) {
                for (const name of Object.keys(attributes)) {
                    if (attributes[name] !== null) {
                        const template = attributes[name];
                        const value = Mustache.render(template, templateData);
                        element.setAttribute(name, value);
                    }
                    else {
                        element.removeAttribute(name);
                    }
                }
            }
        }
    }

    if ("ids" in tr) {
        for (const id of Object.keys(tr.ids)) {
            const newId = tr.ids[id];
            const element = document.getElementById(id);
            element.setAttribute("id", newId);
        }
    }

    if ("remove" in tr) {
        for (const selector of tr.remove) {
            const links = document.querySelectorAll(selector);
            for (const link of links) {
                if (link.innerHTML === "") {
                    remove(link);
                } else {
                    link.outerHTML = link.innerHTML;
                }
            }
        }
    }

    if (options.config.version !== undefined && options.config.version !== "v1") {
        body.setAttribute("data-version", options.config.version);
    }

    return true;
}

module.exports = prepare;
