export function $(query) {
	const nodes = document.querySelectorAll(query);
	if (nodes.length === 1) return nodes[0];
	return nodes;
}

export function id(value) {
	return document.getElementById(value);
}

export default $;
