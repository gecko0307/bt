import "./banner.sass";

const master = gsap.timeline({ id: "MASTER", repeat: -1, paused: true });

function createAnimation(tl) {
	tl.addLabel("start", 0.0);
	//tl.fromTo("#rect", 1.0, { xPercent: 0 }, { xPercent: 100 }, "start");
	//tl.to("#rect", 1.0, { xPercent: 0 }, "+=0.0");
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
	
	master.clear();
	createAnimation(master);
	master.play(0);
}

function replay() {
	resetStop();
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
