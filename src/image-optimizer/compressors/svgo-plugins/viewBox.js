"use strict";

module.exports.type = "perItem";
module.exports.active = true;
module.exports.description = "adds viewBox";

// Add the viewBox attribute if it's missing
module.exports.fn = function(item) {
	if (item.isElem("svg")) {
		if (!item.hasAttr("viewBox")) {
			item.addAttr({
				name: "viewBox",
				value:
					"0 0 " +
					Number(item.attr("width").value) +
					" " +
					Number(item.attr("height").value),
				prefix: "",
				local: "viewBox"
			});
		}
	}
};
