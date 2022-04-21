"use strict";

module.exports.type = "perItem";
module.exports.active = true;
module.exports.description = "adds width and height";

// Add width, height attributes if they're missing
module.exports.fn = function(item) {
	if (item.isElem("svg")) {
		if (item.hasAttr("viewBox")) {
			const viewBox = item.attr("viewBox").value.split(" ");
			if (viewBox.length === 4) {
				if (!item.hasAttr("width")) item.addAttr({ name: "width", value: viewBox[2], prefix: "", local: "width" });
				if (!item.hasAttr("height")) item.addAttr({ name: "height", value: viewBox[3], prefix: "", local: "height" });
			}
			else console.log("Illegal viewBox");
		}
	}
};
