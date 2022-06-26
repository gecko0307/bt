const fs = require("fs-extra");
const path = require("path");

async function strip(filename, document, options) {
    const html = document.getElementsByTagName("html")[0];
    const head = document.getElementsByTagName("head")[0];
    const body = document.getElementsByTagName("body")[0];

    const styles = Array.prototype.slice.call(document.getElementsByTagName("style"));
    let css = "";
    for (const style of styles) {
        const isDevStyle = style.hasAttribute("dev");
        const isPreviewStyle = style.hasAttribute("preview");
        if (isDevStyle || isPreviewStyle) {
            style.remove();
        }
        else {
            css += style.innerHTML + "\r\n";
            style.remove();
        }
    }
    if (css.length > 0) {
        const style = document.createElement("style");
        style.appendChild(document.createTextNode(css));
        body.insertBefore(style, body.firstChild);
    }

    return body.innerHTML;
}

module.exports = strip;
