function timeline(tl) {
    tl.fromTo("#rect", 0.5, { opacity: 0 }, { opacity: 1 }, 0.0);
    tl.fromTo("#rect", 0.5, { opacity: 1 }, { opacity: 0 }, 1.0);
}

module.exports = {
    timeline
};
