/**
 * Angle unit conversion functions
 */
export function degToRad(angle) {
	return (angle / 180.0) * Math.PI;
}

export function radToDeg(angle) {
	return (angle / Math.PI) * 180.0;
}

export function radToRev(angle) {
	return angle / (2.0 * Math.PI);
}

export function revToRad(angle) {
	return angle * (2.0 * Math.PI);
}

/**
 * Distance between two points, (x1, y1) and (x2, y2)
 */
export function distance(x1, y1, x2, y2) {
	const a = x1 - x2;
	const b = y1 - y2;
	return Math.sqrt(a * a + b * b);
}

/**
 * Clamp a number to minimum and maximum thresholds
 */
export function clamp(num, min, max) {
	return num <= min ? min : num >= max ? max : num;
}

/**
 * Normalize value in range
 */
export function normalize(v, vmin, vmax) {
	return clamp((vmax - v) / (vmax - vmin), 0.0, 1.0);
}

/**
 * Linear interpolation function
 */
export function lerp(a, b, t) {
	return a + (b - a) * t;
}

/**
 * Linear interpolation in range
 */
export function lerpInRange(rmin, rmax, v, vmin, vmax) {
	return lerp(rmin, rmax, normalize(v, vmin, vmax));
}

/**
 * Nested linear interpolation between three values
 */
export function lerp3(a, b, c, t1, t2) {
	return lerp(a, lerp(b, c, t2), t1);
}

/**
 * Smoothstep function
 */
export function smoothstep(edge0, edge1, x) {
	x = (clamp(x, edge0, edge1) - edge0) / (edge1 - edge0);
	return x * x * (3 - 2 * x);
}

/**
 * Double smoothstep function
 */
export function doubleSmoothstep(edge0, edge1, blur, x) {
	return smoothstep(edge0, edge0 + blur, x) * (1.0 - smoothstep(edge1 - blur, edge1, x));
}

/**
 * Quadratic Bezier function
 */
export function quadraticBezier(p0, p1, p2, t) {
	return (1.0 - t) * (1.0 - t) * p0 + 2.0 * (1.0 - t) * p1 + t * t * p2;
}

/**
 * Parametric sigmoid function.
 * Linear at k = 0.0,
 * curved at k = 0.5,
 * discrete at k = 1.0
 */
export function sigmoid(k = 0.5) {
	return function(x) {
		return (x + x * k - k * 0.5 - 0.5) / (Math.abs(x * k * 4.0 - k * 2.0) - k + 1.0) + 0.5;
	};
}

/**
 * Linear ease
 */
export function easeLinear(x)
{
	return x;
}

/**
 * Parametric sine ease.
 * Interpolates periodically (repeats animation given number of times, where 1 is one period)
 */
export function sineWaveEase(repeat = 1, attenuation = 0, ease = easeLinear) {
	return function(x) {
		const ex = ease(x);
		return Math.sin(ex * Math.PI * repeat) * 
			(Math.pow(1.0 - ex, 2.0) * attenuation + (1.0 - attenuation));
	};
}

/**
 * Parametric cosine ease.
 * Interpolates periodically (repeats animation given number of times, where 1 is one period)
 */
export function cosineWaveEase(repeat = 1, attenuation = 0, ease = easeLinear) {
	return function(x) {
		const ex = ease(x);
		return Math.cos(ex * Math.PI * repeat) * 
			(Math.pow(1.0 - ex, 2.0) * attenuation + (1.0 - attenuation));
	};
}

/**
 * Parabolic ease
 */
export function parabolicEase() {
	return function(x) {
		const a = (2 * x - 1);
		return -a * a + 1;
	};
}

/**
 * Smoothstep ease
 */
export function smoothstepEase(edge0, edge1) {
	return function(x) {
		return smoothstep(edge0, edge1, x);
	};
}

/**
 * Double smoothstep ease
 */
export function doubleSmoothstepEase(blur) {
	return function(x) {
		return doubleSmoothstep(0.0, 1.0, blur, x);
	};
}

/**
 * Parametric sigmoid ease
 */
export function powerSigmoidEase(alpha) {
	return function(x) {
		const a = alpha + 1.0;
		const p = Math.pow(x, a);
		return p / (p + Math.pow(1.0 - x, a));
	};
}

/**
 * Return a random integer from 0 to maxNumber inclusive
 */
export function randomInt(maxNumber) {
	return clamp(Math.floor(Math.random() * (maxNumber + 1)), 0, maxNumber);
}

/**
 * Returns a random number between minNumber (inclusive) and maxNumber (exclusive)
 */
export function randomIntBetween(minNumber, maxNumber) {
	return Math.floor(Math.random() * (maxNumber - minNumber) + minNumber);
}

/**
 * Sine distrubution
 */
function sineDistribution() {
	const unif = Math.random();
	const a = Math.sin(unif * Math.PI * 0.5);
	return a * a;
}

/**
 * Return a random element from an array
 */
export function randomElement(arr) {
	return arr[randomInt(arr.length - 1)];
}

/**
 * Return a random index of an element based on its weight (0..100)
 */
export function weightedChoice(weights) {
	const weightSum = weights.reduce((sum, w) => sum + w);
	let choice = Math.floor(Math.random() * weightSum) + 1;
	let idx = weights.length - 1;
	while ((choice -= weights[idx]) > 0) {
		idx -= 1;
	}
	return idx;
}

/**
 * In-place remove an element by value from an array
 */
function arrayRemove(arr, item) {
	const index = arr.indexOf(item);
	if (index !== -1) {
		arr.splice(index, 1);
	}
	return arr;
}

/**
 * Shift array elements one index left, keeping the length.
 * Last element is replaced with newElement
 */
export function shiftElements(arr, newElement) {
	for (let i = 0; i < arr.length; i++) {
		if (i < arr.length - 1)
			arr[i] = arr[i+1];
	}
	arr[arr.length - 1] = newElement;
}

/**
 * Set all elements of an array
 */
export function arraySetAll(array, value) {
    for (let i = 0; i < array.length; i++) {
        array[i] = value;
    }
}

/**
 * Get all elements of an array excluding element by a given index
 */
export function arrayExcept(array, index) {
    return array.filter((_, i) => i !== index);
}

/**
 * Return quantitative form of a Russian noun for a given number.
 * Usage example:
 * const noun = getNoun(5, "ход", "хода", "ходов");
 */
export function getNoun(number, one, two, five) { 
	let n = Math.abs(number); 
	n %= 100; 
	if (n >= 5 && n <= 20) return five; 
	n %= 10; 
	if (n === 1) return one; 
	if (n >= 2 && n <= 4) return two; 
	return five; 
}

/**
 * Return formatted integer with thousand separators,
 * e.g. "12 520 400" for 12520400
 */
export function numberWithSpaces(x) {
	return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}


/**
 * Execute a function for each element with given class
 */
export function foreachByClass(className, func) {
	const elements = document.getElementsByClassName(className);
	for (var i = 0; i < elements.length; i++) {
		const element = elements.item(i);
		func(i, element);
	}
}

/**
 * Parse JSON string and return an object if the string is valid,
 * othersize return null
 */
export function jsonToObject(str) {
	let obj;
	try {
		obj = JSON.parse(str);
	} catch(e) {
		obj = null;
	}
	return obj;
}

/**
 * Recalculate value in pixels relative to reference dimension
 */
export function fromDimension(dimension, referenceDimension, pixels) {
	return dimension * (pixels / referenceDimension);
}
