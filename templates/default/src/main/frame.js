import { master, banner } from "./global";

function capture(duration, delay, options) {
	if (window._capture !== undefined) window._capture({ tl: this, delay, duration, options });
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
			banner.timeLimit = 0;
			isPaused = true;
			return;
		}
		
		const stopLabel = (tl.labels["@stop"] !== undefined) ? tl.labels["@stop"] : tl.labels["_@stop"];
		const stopTime = tl.startTime() + stopLabel;
		
		if (banner.timeLimit > 0) {
			const oneLoopTime = master.duration() + master.repeatDelay();
			const currentTime = master.time() + oneLoopTime * loops;
			
			if (currentTime > banner.timeLimit) {
				alert("Animation exceeds banner.timeLimit: " + currentTime + "s / " + banner.timeLimit + "s");
			}

			if ((currentTime + oneLoopTime) > banner.timeLimit){
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

export function frame(tlFunc, gsapOptions = {}) {
	gsapOptions.id = tlFunc.name;
	const tl = gsap.timeline(gsapOptions);
	tl.stop = stop;
	tl.capture = capture;
	tlFunc(tl);
	return tl;
}
