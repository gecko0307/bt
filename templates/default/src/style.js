/*
 * Sets CSS properties for a single element or multiple elements, directly or by string selector.
 * Numeric values are treated as pixels. To specify other units, use string values.
 */
function setStyle(elements, props) {
	if (elements === undefined || elements === null) {
		console.error("Attempt to set style for", elements);
		return;
	}
	
	if (typeof elements === "string") {
		elements = document.querySelectorAll(elements);
	}
	
	if (!Array.isArray(elements) && !(elements instanceof NodeList) && !(elements instanceof HTMLCollection)) {
		elements = [elements];
	}
	
	elements.forEach(element => {
		if (element === undefined || element === null) {
			console.error("Attempt to set style for", element);
			return;
		}
		
		for (const key in props) {
			if (props.hasOwnProperty(key)) {
				let value = props[key];
				if (typeof value === "number") {
					value += "px";
				}
				element.style[key] = value;
			}
		}
	});
}

export default {
	set: setStyle
};
