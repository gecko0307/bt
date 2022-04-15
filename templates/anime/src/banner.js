import "./banner.sass";

import smartloop from "./anime/smartloop";

const master = anime.timeline({
	easing: "easeInOutQuad",
	loop: true,
	autoplay: false
});

const timeLimit = 30.0;
const stopTime = 1.0;

function createAnimation(tl) {
	tl.add({ targets: "#rect", duration: 1000, translateX: "100%" });
	tl.add({ targets: "#rect", duration: 1000, translateX: "0" });
}

if (window.onload === null) window.onload = open;

function open() {
	if (window.blocked === true) return;
	start();
}

function start() {
	resize();
	const container = document.getElementById("container");
	container.style.opacity = "1";
	
	// window.onresize = function() { resize(); };
	
	master.reset();
	createAnimation(master);
	smartloop(master, timeLimit, stopTime);
	master.play(0);
}

function replay() {
	start();
}

function resize() {
}

export default {
	master,
	open,
	replay,
	info: { type: "anime", version: 1 },
};
