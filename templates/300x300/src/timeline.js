class Timeline {
	constructor() {
		this.tweens = [];
	}

	fromTo(selector, duration, propsFrom, propsTo, time) {
		const tween = {
			selector: selector,
			duration: duration,
			propsFrom: propsFrom,
			propsTo: propsTo,
			time: time
		};
		this.tweens.push(tween);
	}
}

module.exports = {
	Timeline
};
