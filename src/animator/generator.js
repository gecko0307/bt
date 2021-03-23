const { KeyframesRule } = require("./keyframes");

function generateStyle(timeline) {
    const tweens = timeline.tweens;
    const tweensBySelector = {};
    let totalDuration = 0;
    
    for (const tween of tweens) {
        const endTime = tween.time + tween.duration;
        if (endTime > totalDuration) totalDuration = endTime;
        
        if (tween.selector in tweensBySelector) {
            tweensBySelector[tween.selector].push(tween);
        }
        else {
            tweensBySelector[tween.selector] = [tween];
        }
    }

    const selectors = Object.keys(tweensBySelector);
    let output = "";

    for (const selector of selectors) {
        const kfr = new KeyframesRule();

        output += selector;
        output += " {\r\n";
        output += `	animation-name: ${kfr.name};\r\n`;
        output += `	animation-duration: ${totalDuration}s;\r\n`;
        output += `	animation-iteration-count: infinite;\r\n`;
        output += "}\r\n\r\n";

        const tweens = tweensBySelector[selector];
        for (const tween of tweens) {
            const startPercent = Math.floor(tween.time / totalDuration * 100);
            const endPercent = Math.floor((tween.time + tween.duration) / totalDuration * 100);
            kfr.addKeyframe(startPercent, tween.propsFrom);
            kfr.addKeyframe(endPercent, tween.propsTo);
        }

        output += kfr.css();
        output += "\r\n";
    }

    return output;
}

module.exports = {
    generateStyle
};