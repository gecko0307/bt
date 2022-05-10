const fs = require("fs-extra");
const path = require("path");

async function prepare(filename, document, tr) {
    const head = document.getElementsByTagName("head")[0];
    const body = document.getElementsByTagName("body")[0];
    const link = document.getElementById("link");

    // TODO
    
    return true;
}

module.exports = prepare;
