const timeLimit = 30;
const stopTime = 1;

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
        if (tl._smartLoop.loop == tl._smartLoop.stopAtLoop) {
            console.log(`stopped at loop ${tl._smartLoop.loop} / ${t}s`);
            tl.seek(tl._smartLoop.stopTime * 1000);
            tl._smartLoop.loop = 0;
            tl.pause();
        }
    };
}

export default smartloop;
