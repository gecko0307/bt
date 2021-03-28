import stop from "./stop";

function mainTimeline()
{
    const tl = gsap.timeline({ repeat: -1, paused: true });
    tl.addLabel("start", 0.0);
    
    tl.addLabel("slide1", "start");
    tl.fromTo("#t1", 0.5, { autoAlpha: 0 }, { autoAlpha: 1 }, "slide1");
    
    tl.addLabel("slide2", "+=2.0");
    tl.to("#t1", 0.5, { autoAlpha: 0 }, "slide2");
    tl.fromTo("#t2", 0.5, { autoAlpha: 0 }, { autoAlpha: 1 }, "slide2+=0.5");
    
    tl.addLabel("slide3", "+=2.0");
    tl.to("#t2", 0.5, { autoAlpha: 0 }, "slide3");
    tl.fromTo("#t3", 0.5, { autoAlpha: 0 }, { autoAlpha: 1 }, "slide3+=0.5");
    
    tl.addLabel("slide4", "+=2.0");
    tl.to("#t3", 0.5, { autoAlpha: 0 }, "slide4");
    tl.fromTo("#t4", 0.5, { autoAlpha: 0 }, { autoAlpha: 1 }, "slide4+=0.5");
    stop(tl, 30.0, "+=0.0");
    
    tl.addLabel("end", "+=3.0");
    tl.to("#t4", 0.5, { autoAlpha: 0 }, "end");
    
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
