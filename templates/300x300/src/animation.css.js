const { Timeline } = require("./Timeline");

function timeline() {
    const tl = new Timeline();
    tl.fromTo("#rect2", 0.5, { opacity: 0, "background-color": "#ff0000" }, { opacity: 1 }, 0.0);
    tl.fromTo("#rect2", 0.5, { opacity: 1 }, { opacity: 0, "background-color": "#00ff00" }, 2.0);
    return tl;
}

module.exports = {
    timeline
};
