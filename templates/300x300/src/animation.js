import stop from "./stop";

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

export
{
    start
};
