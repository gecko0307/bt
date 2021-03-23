const { KeyframesRule } = require("./keyframes");
const { generateStyle } = require("./generator");

module.exports = {
    KeyframesRule, 
    generateAnimationStyle: generateStyle
};
