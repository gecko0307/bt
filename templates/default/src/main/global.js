import { container } from "./dom";
import { detectCapturing } from "./capture";

export const master = gsap.timeline({ id: "MASTER", repeat: -1, paused: true });

export const banner = {
};

let isLoaded = false;
export let isCapturing;

window.addEventListener("load", () => {
	isLoaded = true;
	isCapturing = detectCapturing();
});

let opened;

export let isBannerReady = false;

export let bannerW;
export let bannerH;
export let halfW;
export let halfH;
export let ratio;

export function open() {
	opened = true;
}

export function close() {
	opened = false;
}

export const bannerReadyChecks = [
	() => opened === true,
	() => isLoaded === true || document.readyState === "complete",
	() => bannerW > 0 && bannerH > 0 && window.innerWidth > 0 && window.innerHeight > 0,
];

export function update() {
	bannerW = container.offsetWidth;
	bannerH = container.offsetHeight;
	halfW = bannerW * 0.5;
	halfH = bannerH * 0.5;
	ratio = bannerW / bannerH;
	isBannerReady = bannerReadyChecks.every(func => func() === true);
}
