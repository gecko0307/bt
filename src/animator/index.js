const { KeyframesRule } = require("./keyframes");
const { Timeline } = require("./timeline");
const { generateStyle } = require("./generator");

module.exports = {
    KeyframesRule, Timeline,
    generateAnimationStyle: generateStyle
};
