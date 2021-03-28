
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
(function () {
    'use strict';

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

    function mainTimeline()
    {
        const tl = gsap.timeline({ repeat: -1, paused: true });
        tl.addLabel("start", 0.0);
        tl.fromTo("#rect", 1.0, { xPercent: 0 }, { xPercent: 450, ease: "power2.inOut" }, "start");
        tl.fromTo("#rect", 1.0, { yPercent: 0 }, { yPercent: 900, ease: "power2.inOut" }, "+=0.0");
        tl.fromTo("#rect", 0.5, { scale: 1, transformOrigin: "right bottom" }, { scale: 10, ease: "power2.inOut" }, "+=0.0");
        stop(tl, 10.0, "+=0.0");
        return tl;
    }

    let master;

    function start()
    {
        console.log("start");
        master = mainTimeline();
        master.play(0);
    }

    function main()
    {
        start();
    }

    window.onload = main;

}());
//# sourceMappingURL=bundle.js.map
