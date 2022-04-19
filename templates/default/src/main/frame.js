function capture(duration, delay, options) {
	if (window._capture !== undefined) window._capture({ tl: this, delay, duration, options });
}

export function frame(tlFunc, gsapOptions = {}) {
	gsapOptions.id = tlFunc.name;
	const tl = gsap.timeline(gsapOptions);
	// TODO:
	//tl.stop = stop;
	tl.capture = capture;
	tlFunc(tl);
	return tl;
}
