import smartloop from "./smartloop";

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

export
{
    start
};
