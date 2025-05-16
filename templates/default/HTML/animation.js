//#
//# Сгенерировано, не лезь!
//# Не вноси сюда никаких изменений!
//#

var animation = (function(window, document, gsap, undefined){
	'use strict';

	function id(value) {
		return document.getElementById(value);
	}

	// Сгенерировано, не лезь!

	id("link");
	const container = id("container");
	id("overlay");

	function capture(duration, delay, options) {
		if (window._capture !== undefined) window._capture({ tl: this, delay, duration, options });
	}

	const master = gsap.timeline({ id: "MASTER", repeat: -1, paused: true });

	const banner$1 = {
	};

	let isLoaded = false;

	window.addEventListener("load", () => {
		isLoaded = true;
	});

	let opened;

	let isBannerReady = false;

	let bannerW;
	let bannerH;

	function open$1() {
		opened = true;
	}

	const bannerReadyChecks = [
		() => opened === true,
		() => isLoaded === true || document.readyState === "complete",
		() => bannerW > 0 && bannerH > 0 && window.innerWidth > 0 && window.innerHeight > 0,
	];

	function update() {
		bannerW = container.offsetWidth;
		bannerH = container.offsetHeight;
		isBannerReady = bannerReadyChecks.every(func => func() === true);
	}

	let isFirst = true;
	let isStopAdded = false;
	let isPaused = false;
	let loops = 0;

	function stop(delay = "+=0.0", timeline) {
		if (isStopAdded === true && isFirst === true) {
			alert("More than one tl.stop() call found");
			return;
		}

		isStopAdded = true;
		isFirst = false;
		const tl = (timeline !== undefined) ? timeline : this;

		function checkStop() {
			if (isPaused || master.paused()) {
				banner$1.timeLimit = 0;
				isPaused = true;
				return;
			}
			
			const stopLabel = (tl.labels["@stop"] !== undefined) ? tl.labels["@stop"] : tl.labels["_@stop"];
			const stopTime = tl.startTime() + stopLabel;
			
			if (banner$1.timeLimit > 0) {
				const oneLoopTime = master.duration() + master.repeatDelay();
				const currentTime = master.time() + oneLoopTime * loops;
				
				if (currentTime > banner$1.timeLimit) {
					alert("Animation exceeds banner.timeLimit: " + currentTime + "s / " + banner$1.timeLimit + "s");
				}

				if ((currentTime + oneLoopTime) > banner$1.timeLimit){
					master.pause(stopTime, true);
					console.log("Stopped at " + currentTime + "s");
					isPaused = true;
				}
			}
			
			loops += 1;
		}

		tl.addLabel("_@stop", delay);
		tl.add(checkStop, "_@stop");
	}

	function checkStops() {
		if (banner$1.timeLimit > 0) {
			if (isStopAdded === false) {
				alert("No tl.stop() found");
			}
			if (master.duration() > banner$1.timeLimit){
				alert("Animation loop exceeds banner.timeLimit");
			}
		}
	}

	function resetStop() {
		isPaused = false;
		loops = 0;
	}

	function frame(tlFunc, gsapOptions = {}) {
		gsapOptions.id = tlFunc.name;
		const tl = gsap.timeline(gsapOptions);
		tl.stop = stop;
		tl.capture = capture;
		tlFunc(tl);
		return tl;
	}

	banner$1.timeLimit = 0;

	function createAnimation(tl) {
		tl.add(frame(opening, {}), "+=0.0");
	}

	function opening(tl) {
		tl.addLabel("start", 0.0);

		//tl.capture(2.5, "+=0.0");
		//tl.stop("+=0.0");
		//if (global.isCapturing)
	}

	if (window.onload === null) window.onload = open;

	function open() {
		if (window.blocked === true) return;
		open$1();
		//
		start();
	}

	function start() {
		console.info("start");
		resize();
		if (!isBannerReady) return gsap.delayedCall(0.02, start);

		container.style.opacity = "1";
		
		window.onresize = function() { resize(); };
		
		master.clear();
		createAnimation(master);
		master.play(0);

		checkStops();
	}

	function replay() {
		resetStop();
		start();
	}

	function resize() {
		update();
		if (!isBannerReady) return;
		//
	}

	gsap.defaults({
		ease: "linear"
	});

	var banner = {
		master,
		open,
		// close,
		replay,
		info: { type: "gsap", version: 2 },
	};

	return banner;

})(window, window.document, window.gsap);//# sourceMappingURL=animation.js.map
