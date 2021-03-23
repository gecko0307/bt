function timeline(tl) {
    tl.fromTo("#rect2", 0.5, { opacity: 0, "background-color": "#ff0000" }, { opacity: 1 }, 0.0);
    tl.fromTo("#rect2", 0.5, { opacity: 1 }, { opacity: 0, "background-color": "#ff00ff" }, 2.0);
}

module.exports = {
    timeline
};
