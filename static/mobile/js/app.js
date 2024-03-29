function main() {

	// If deviceorientation events are supported, kick the user out of emulator

	var isFirstEvent = true;

	var starter = window.setTimeout( function() {
		// Remove this device orientation check
		window.removeEventListener( 'deviceorientation', check, false );
		if ( document.readyState == 'complete' ) {
			startEmulator(); // emulator.js
		} else {
			window.addEventListener( 'load', startEmulator, false );
		}
	}, 2000 );

	function check() {
		// Discard first event (false positive on Chromium Desktop browsers)
		if ( isFirstEvent ) {
			isFirstEvent = false;
			return;
		}

		window.clearTimeout( starter );

		// Remove this device orientation check
		window.removeEventListener( 'deviceorientation', check, false );

		// Open the original page
		var pageUrl = getParameterByName( 'url' );
		window.location = pageUrl || 'https://github.com/richtr/doe';
	};

	window.addEventListener( 'deviceorientation', check, false );
}

main();
