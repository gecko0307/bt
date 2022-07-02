import { writable } from "svelte/store";

export const bannerInfo = writable({
	width: 0,
	height: 0
});
