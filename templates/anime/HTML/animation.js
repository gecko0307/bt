//#
//# Сгенерировано, не лезь!
//# Не вноси сюда никаких изменений!
//#

(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var animation = (function(window, document, gsap, undefined){
	'use strict';

	function smartloop(tl, timeLimit, stopTime)
	{
		tl._smartLoop = {
			timeLimit: timeLimit,
			stopTime: stopTime,
			loop: 0,
			stopAtLoop: Math.floor(timeLimit / (tl.duration / 1000))
		};
		tl.loopComplete = function() {
			tl._smartLoop.loop++;
			const t = tl._smartLoop.loop * tl.duration / 1000;
			if (tl._smartLoop.loop == tl._smartLoop.stopAtLoop) {
				console.log(`stopped at loop ${tl._smartLoop.loop} / ${t}s`);
				tl.seek(tl._smartLoop.stopTime * 1000);
				tl._smartLoop.loop = 0;
				tl.pause();
			}
		};
	}

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

	var banner = {
		master,
		open,
		replay,
		info: { type: "anime", version: 1 },
	};

	return banner;

})(window, window.document, window.gsap);//# sourceMappingURL=animation.js.map
