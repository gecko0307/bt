
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
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

    function main()
    {
        console.log("main");
        const tl = mainTimeline();
        tl.play();
    }

    window.onload = main;

}());
//# sourceMappingURL=bundle.js.map
