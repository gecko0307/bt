
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
(function () {
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
            if (tl._smartLoop.loop === tl._smartLoop.stopAtLoop) {
                console.log(`stopped at loop ${tl._smartLoop.loop} / ${t}s`);
                tl.seek(tl._smartLoop.stopTime * 1000);
                tl._smartLoop.loop = 0;
                tl.pause();
            }
        };
    }

    function mainTimeline()
    {
        const tl = anime.timeline({
            easing: "easeInOutQuad",
            loop: true,
            autoplay: false
        });
        
        tl.add({ targets: "#rect", duration: 1000, translateX: "450%", transformOrigin: ["center center 0", "center center 0"] });
        tl.add({ targets: "#rect", translateY: "900%", backgroundColor: "#0000ff" });
        tl.add({ targets: "#rect", duration: 500, transformOrigin: ["right bottom 0", "right bottom 0"],
            scaleX: 10.0,
            scaleY: 10.0
        });
        
        return tl;
    }

    const timeLimit = 30.0;
    const stopTime = 1.0;

    let master;

    function start()
    {
        console.log("start");
        master = mainTimeline();
        smartloop(master, timeLimit, stopTime);
        master.play();
    }

    function main()
    {
        start();
    }

    window.onload = main;

}());
//# sourceMappingURL=bundle.js.map
