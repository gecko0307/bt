class KeyframesRule {
	constructor() {
		this.name = uniqueName("animation");
		this.keyframes = {};
	}

	addKeyframe(percent, props) {
		if (percent in this.keyframes) {
			this.keyframes[percent].push(props);
		}
		else {
			this.keyframes[percent] = [props];
		}
	}

	css() {
		const keys = Object.keys(this.keyframes);
		const keysSorted = keys.sort();
		const first = keysSorted[0];
		const last = keysSorted[keysSorted.length - 1];

		if (!(0 in this.keyframes)) this.keyframes[0] = this.keyframes[first];
		if (!(100 in this.keyframes)) this.keyframes[100] = this.keyframes[last];

		let output = "";
		output += `@keyframes ${this.name} {\r\n`;

		for (const percent of Object.keys(this.keyframes)) {
			output += `	${percent}% { `;
			const keyframe = this.keyframes[percent];
			for (const p of keyframe) {
				const props = Object.keys(p);
				for (const i of props) {
					output += `${i}: ${p[i]}; `;
				}
			}
			output += "}\r\n";
		}
		output += "}\r\n";

		return output;
	}
}

let num = 0;
function uniqueName(baseStr) {
	const res = baseStr + num;
	num++;
	return res;
}

module.exports = {
	KeyframesRule
};
