import { stop } from "./stop";
import { capture } from "./capture";

export function frame(tlFunc, gsapOptions = {}) {
	gsapOptions.id = tlFunc.name;
	const tl = gsap.timeline(gsapOptions);
	tl.stop = stop;
	tl.capture = capture;
	tlFunc(tl);
	return tl;
}
