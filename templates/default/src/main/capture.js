export function capture(duration, delay, options) {
	if (window._capture !== undefined) window._capture({ tl: this, delay, duration, options });
}

export function detectCapturing() {
	return (window._capture !== undefined);
}
