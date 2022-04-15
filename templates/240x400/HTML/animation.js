//#
//# Сгенерировано, не лезь!
//# Не вноси сюда никаких изменений!
//#

(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var animation = (function(window, document, gsap, undefined){
	'use strict';

	const master = gsap.timeline({ id: "MASTER", repeat: -1, paused: true });

	function createAnimation(tl) {
		tl.addLabel("start", 0.0);
		tl.fromTo("#rect", 1.0, { xPercent: 0 }, { xPercent: 100 }, "start");
		tl.to("#rect", 1.0, { xPercent: 0 }, "+=0.0");
	}

	if (window.onload === null) window.onload = open;

	function open() {
		if (window.blocked === true) return;
		start();
	}

	function start() {
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

	gsap.defaults({
		ease: "linear"
	});

	var banner = {
		master,
		open,
		replay,
		info: { type: "gsap", version: 1 },
	};

	return banner;

})(window, window.document, window.gsap);//# sourceMappingURL=animation.js.map
