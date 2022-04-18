window.frames = [];

window._capture = function({ tl, duration = 2.5, delay = "+=0.0" } = {}){
	if (tl === undefined) alert("no timeline");
	
	var labelName = "#" + (frames.length + 1);
	tl.addLabel(labelName, delay);
	
	window.frames.push([
		function() {
			window.animation.master.pause(tl.startTime() + tl.labels[labelName]);
		},
		Math.round(duration * 1000)
	]);
}
