const fs = require("fs-extra");
const path = require("path");
const Mustache = require("mustache");

async function prepare(filename, document, tr, options) {
    const head = document.getElementsByTagName("head")[0];
    const body = document.getElementsByTagName("body")[0];

    const templateData = {
        banner: options.banner
    };

    /*
    // TODO: replace ids
    link.setAttribute("id", "click1_area");
    */

    if ("head" in tr.tags) {
        for (const tag of tr.tags.head) {
            const element = document.createElement(tag.tag);
            if (tag.text) element.innerHTML = tag.text;
            for (const name of Object.keys(tag.attributes)) {
                const template = tag.attributes[name];
                const value = Mustache.render(template, templateData);
                element.setAttribute(name, value);
            }
            head.appendChild(element);
        }
    }

    if ("body" in tr.tags) {
        for (const tag of tr.tags.body) {
            const element = document.createElement(tag.tag);
            if (tag.text) element.innerHTML = tag.text;
            for (const name of Object.keys(tag.attributes)) {
                const template = tag.attributes[name];
                const value = Mustache.render(template, templateData);
                element.setAttribute(name, value);
            }
            body.appendChild(element);
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

    return true;
}

module.exports = prepare;
