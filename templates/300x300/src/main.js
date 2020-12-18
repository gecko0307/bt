import "./main.sass";
import * as animation from "./animation";

function main()
{
    animation.start();
    setTimeout(animation.stop, 30000);
}

window.onload = main;
