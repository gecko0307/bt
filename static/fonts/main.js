const divFonts = document.getElementById("fonts");
let fonts = [];

async function apiRequest(data) {
	const res = await fetch("/api", {
		method: "POST",
		body: JSON.stringify(data)
	});
	return await res.json();
}

async function updateFontsList() {
	const res = await apiRequest({
		method: "fontsList"
	});
	fonts = res.data.fonts;
	divFonts.innerText = JSON.stringify(fonts);
}

async function main() {
	updateFontsList();
}

document.addEventListener("DOMContentLoaded", main);
