export class Scenario {
	constructor() {
		this.steps = [];
		this.currentDelay = 0;
	}

	wait(time) {
		this.currentDelay += time;
		return this;
	}

	then(fn) {
		const delay = this.currentDelay;
		this.steps.push({ delay, fn });
		return this;
	}
	
	at(delay, fn) {
		this.steps.push({ delay, fn });
		return this;
	}

	start() {
		this.steps
			.sort((a, b) => a.delay - b.delay)
			.forEach(step => {
				gsap.delayedCall(step.delay, step.fn, [this]);
			});
		return this;
	}
}
