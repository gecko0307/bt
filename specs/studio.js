		"use strict"
		window.onload = function() {
			if (Enabler.isInitialized()) {
				enablerInitHandler();
			} else {
				Enabler.addEventListener(studio.events.StudioEvent.INIT, enablerInitHandler);
			}
		}
		
		function enablerInitHandler() {
			animation.open();
			
			function linkHandler(e) { Enabler.exit("link"); }
			document.getElementById("link").addEventListener("click", linkHandler, false);
			
		}
	