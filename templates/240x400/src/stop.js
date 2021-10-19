function stop(tl, timeLimit, position) {
    tl.addLabel("_smartloop_stop", position);
    tl.call(function(this_tl) {
        if (this_tl._smartLoop === undefined) {
            this_tl._smartLoop = {
                timeLimit: timeLimit,
                stopLabel: "_smartloop_stop",
                loop: 0,
                stopAtLoop: Math.floor(timeLimit / this_tl.duration())
            };
        }
        
        this_tl._smartLoop.loop++;
        const t = this_tl._smartLoop.loop * this_tl.duration();
        if (this_tl._smartLoop.loop == this_tl._smartLoop.stopAtLoop) {
            console.log(`stopped at loop ${this_tl._smartLoop.loop} / ${t}s`);
            this_tl._smartLoop.loop = 0;
            this_tl.pause(this_tl._smartLoop.stopLabel);
        }
    }, [tl]);
}

export default stop;
