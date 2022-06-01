import { master, banner } from "./main/global";
import select, { container } from "./main/dom";
import * as $ from "./main/dom";
import { frame } from "./main/frame";
//import "./banner.sass";

banner.timeLimit = 4;

function createAnimation(tl) {
	tl.add(frame(opening, {}), "+=0.0");
}

function opening(tl){
	tl.addLabel("start", 0.0);
	tl.fromTo($.rect, 1.0, { xPercent: 0 }, { xPercent: 100, ease: "power2.inOut" }, "start");
	tl.to($.rect, 1.0, { xPercent: 0, ease: "power2.inOut" }, "start+=1.0");
	tl.stop("start+=2.0");
}

if (window.onload === null) window.onload = open;

function open() {
	if (window.blocked === true) return;
	start();
}

function start() {
	resize();
	container.style.opacity = "1";
	
	// window.onresize = function() { resize(); };
	
	master.clear();
	createAnimation(master);
	master.play(0);
}

function replay() {
	start();
}

function resize() {
}

gsap.defaults({
	ease: "linear"
});

export default {
	master,
	open,
	replay,
	info: { type: "gsap", version: 1 },
};
