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

const timeLimit = 30;
const stopTime = 1;

let master;
let loop = 0;
let stopAtLoop = 0;

function start()
{
    console.log("start");
    master = mainTimeline();
    master.loopComplete = function() {
        loop++;
        const t = loop * master.duration / 1000;
        if (loop === stopAtLoop) {
            console.log(`stopped at loop ${loop} / ${t}s`);
            master.seek(stopTime * 1000);
            loop = 0;
            master.pause();
        }
    };
    console.log(master.duration / 1000);
    stopAtLoop = Math.floor(timeLimit / (master.duration / 1000));
    master.play();
}

export
{
    start
};
