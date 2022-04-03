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
                this_tl._smartLoop.loop = 0;
                this_tl.pause(this_tl._smartLoop.stopLabel);
            }
        }, [tl]);
    }

    function mainTimeline()
    {
        const tl = gsap.timeline({ repeat: -1, paused: true });
        tl.addLabel("start", 0.0);
        
        tl.addLabel("slide1", "start");
        tl.fromTo("#t1", 0.5, { autoAlpha: 0 }, { autoAlpha: 1 }, "slide1");
        tl.addLabel("capture 1", "+=0.0");
        
        tl.addLabel("slide2", "+=2.0");
        tl.to("#t1", 0.5, { autoAlpha: 0 }, "slide2");
        tl.fromTo("#t2", 0.5, { autoAlpha: 0 }, { autoAlpha: 1 }, "slide2+=0.5");
        tl.addLabel("capture 2", "+=0.0");
        
        tl.addLabel("slide3", "+=2.0");
        tl.to("#t2", 0.5, { autoAlpha: 0 }, "slide3");
        tl.fromTo("#t3", 0.5, { autoAlpha: 0 }, { autoAlpha: 1 }, "slide3+=0.5");
        tl.addLabel("capture 3", "+=0.0");
        
        tl.addLabel("slide4", "+=2.0");
        tl.to("#t3", 0.5, { autoAlpha: 0 }, "slide4");
        tl.fromTo("#t4", 0.5, { autoAlpha: 0 }, { autoAlpha: 1 }, "slide4+=0.5");
        tl.addLabel("capture 4", "+=0.0");
        stop(tl, 30.0, "+=0.0");
        
        tl.addLabel("end", "+=3.0");
        tl.to("#t4", 0.5, { autoAlpha: 0 }, "end");
        
        return tl;
    }

    let master;

    function start()
    {
        master = mainTimeline();
        window.animation = {
            master: master
        };
        master.play(0);
    }

    function main()
    {
        start();
    }

    window.addEventListener("DOMContentLoaded", main);

}());
