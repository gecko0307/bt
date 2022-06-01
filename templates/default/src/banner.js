import { master, banner } from "./main/global";
import * as global from "./main/global";
import { bannerW, bannerH, halfW, halfH, ratio } from "./main/global";
import select, { container } from "./main/dom";
import * as $ from "./main/dom";
import { capture, stop, checkStops, frame } from "./main/frame";
//import "./banner.sass";

banner.timeLimit = 0;

function createAnimation(tl) {
	tl.add(frame(opening, {}), "+=0.0");
}

function opening(tl) {
	tl.addLabel("start", 0.0);
}

if (window.onload === null) window.onload = open;

function open() {
	if (window.blocked === true) return;
	global.open();
	//
	start();
}

function start() {
	console.info("start");
	resize();
	if (!global.isBannerReady) return gsap.delayedCall(0.02, start);

	container.style.opacity = "1";
	
	window.onresize = function() { resize(); };
	
	master.clear();
	createAnimation(master);
	master.play(0);

	checkStops();
}

function close() {
	container.style.opacity = "0";
	window.onresize = null;
	master.pause(0);
	global.close();
}

function replay() {
	start();
}

function resize() {
	global.update();
	if (!global.isBannerReady) return;
	//
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
