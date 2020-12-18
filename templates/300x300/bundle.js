(function () {
    'use strict';

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

    let master;

    function start()
    {
        master = mainTimeline();
        master.play();
    }

    function stop()
    {
        master.pause();
    }

    function main()
    {
        start();
        setTimeout(stop, 30000);
    }

    window.onload = main;

}());
