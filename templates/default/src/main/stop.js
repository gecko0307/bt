import { master, banner } from "./global";

let isFirst = true;
let isStopAdded = false;
let isPaused = false;
let loops = 0;

export function stop(delay = "+=0.0", timeline) {
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

export function checkStops() {
	if (banner.timeLimit > 0) {
		if (isStopAdded === false) {
			alert("No tl.stop() found");
		}
		if (master.duration() > banner.timeLimit){
			alert("Animation loop exceeds banner.timeLimit");
		}
	}
}

export function resetStop() {
	isPaused = false;
	loops = 0;
}
