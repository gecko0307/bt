var selfUrl = new URL( window.location );

function startEmulator() {
	var controller = document.querySelector( 'iframe#controller' );
	var emulatorMenu = document.querySelector( '#emulator' );

	var deviceContainer = document.querySelector( '#deviceContainer' );
	var deviceFrame = document.querySelector( 'iframe#deviceFrame' );
	
	var help = document.querySelector('#emulator_help');
	
	deviceFrame.onload = function() {
		injectTouchEmulator();
	}

	controller.addEventListener( 'load', function() {
		controller.isLoaded = true;

		controller.style.display = 'block';
		emulatorMenu.style.display = 'block';
	}, false );

	// Load controller
	controller.src = 'controller/index.html';

	deviceFrame.addEventListener( 'load', function() {
		deviceFrame.isLoaded = true;
		deviceFrame.style.display = 'block';
	}, false );

	// Load target in screen iframe
	deviceFrame.src = bannerUrl; //"screen.html" + location.search;

	var scaleFactor = 1;

	function updateParamURL(prmName, val) {
		var res = "";
		var d = location.href.split("#")[0].split("?");
		var base = d[0];
		var query = d[1];
		/*
		if (query) {
			var params = query.split("&");
			for (var i = 0; i < params.length; i++) {
				var keyval = params[i].split("=");
				if (keyval[0] != prmName) {
					res += params[i] + "&";
				}
			}
		}
		else
		*/
		res += prmName + "=" + val;
		if (history.pushState) {
			var newurl = base + "?" + res;
			console.log(newurl);
			window.history.pushState({ path: newurl }, "", newurl);
		}
	};
	
	function injectTouchEmulator() {
		var doc = deviceFrame.contentWindow.document;

		function onFileLoaded() {
			var fileContents = this.response;
			var script = doc.createElement("script");
			script.type = "text/javascript";
			script.innerHTML = fileContents;
			doc.body.appendChild(script);
			deviceFrame.contentWindow.eval(script.innerHTML);
		}

		var xmlhttp;
		xmlhttp = new XMLHttpRequest();
		xmlhttp.addEventListener("load", onFileLoaded, false);
		xmlhttp.open("GET", "js/touch-emulator.js", true);
		xmlhttp.send();
	}

	$( 'button.apply_url' ).on( 'click', function( e ) {
		bannerUrl = document.getElementById("banner_url").value;
		deviceFrame.src = bannerUrl;
		updateParamURL("url", bannerUrl);
		injectTouchEmulator();
	});
	
	$( 'button.refresh' ).on( 'click', function( e ) {
		// reset the controller
		sendMessage(
			controller, {
				'action': 'restart'
			},
			selfUrl.origin
		);

		// Update controller rendering
		sendMessage(
			controller, {
				'action': 'rotateScreen',
				'data': {
					'rotationDiff': currentScreenOrientation,
					'totalRotation': currentScreenOrientation,
					'updateControls': true
				}
			},
			selfUrl.origin
		);

		console.log("Reloading banner");
		deviceFrame.src = bannerUrl;
		deviceFrame.contentDocument.location.reload(true);
		injectTouchEmulator();
	});

	$( 'button[data-viewport-width]' ).on( 'click', function( e ) {
		if ( $( this ).attr( 'data-viewport-width' ) == '100%' ) {
			newWidth = '100%';
		} else {
			newWidth = $( this ).attr( 'data-viewport-width' );
		}
		if ( $( this ).attr( 'data-viewport-height' ) == '100%' ) {
			newHeight = '100%';
		} else {
			newHeight = $( this ).attr( 'data-viewport-height' );
		}
		$( 'button[data-viewport-width]' ).removeClass( 'asphalt active' ).addClass( 'charcoal' );
		$( this ).addClass( 'asphalt active' ).removeClass( 'charcoal' );
		
		//console.log($(this).attr('data-zoom'));
		$( '#deviceContainer' ).css( {
			'width': newWidth,
			'height': newHeight,
			'zoom': $(this).attr('data-zoom')
		} );
		$( '#deviceFrame' ).css( {
			'width': newWidth,
			'height': newHeight,
			'min-width': newWidth,
			'min-height': newHeight,
			'zoom': $(this).attr('data-zoom')
		} );
		e.preventDefault();

		var w = parseInt( newWidth, 10 );
		var h = parseInt( newHeight, 10 );
		var newDimension = 0;

		// Take the larger of the two values
		if ( w >= h ) {
			newDimension = w;
		} else {
			newDimension = h;
		}

		// Relay new dimensions on to deviceFrame
        /*
		sendMessage(
			deviceFrame, {
				'action': 'updateScreenDimensions',
				'data': {
					'newWidth': newDimension + "px",
					'newHeight': newDimension + "px"
				}
			},
			origin //selfUrl.origin
		);
        */
		return false;
	});

	$( 'button.rotate' ).on( 'click', function( e ) {
		var currentRotation = (currentScreenOrientation == 0 ? 360 : currentScreenOrientation);

		// Post message to self to update screen orientation
		postMessage( JSON.stringify( {
			'action': 'updateScreenOrientation',
			'data': {
				'totalRotation': currentRotation - 90,
				'updateControls': true
			}
		} ), selfUrl.origin );
	});

	var deviceScaleValue = $( '#deviceScaleValue' );

	$( '#deviceScaling' ).on( 'input', function( e ) {
		scaleFactor = e.target.value;
		deviceScaleValue.text( scaleFactor + "x" );
	} );

	$( 'button.reset' ).on( 'click', function( e ) {
		// reset the controller
		sendMessage(
			controller, {
				'action': 'restart'
			},
			selfUrl.origin
		);

		// Update controller rendering
		sendMessage(
			controller, {
				'action': 'rotateScreen',
				'data': {
					'rotationDiff': currentScreenOrientation,
					'totalRotation': currentScreenOrientation,
					'updateControls': true
				}
			},
			selfUrl.origin
		);
	});
	
	$( 'button.help' ).on( 'click', function( e ) {
		var style = help.style;
		if (style.visibility == 'hidden' || style.visibility == '')
			style.visibility = 'visible';
		else
			style.visibility = 'hidden';
	});

	var orientationAlpha = document.querySelector( 'input#orientationAlpha' );
	var orientationBeta = document.querySelector( 'input#orientationBeta' );
	var orientationGamma = document.querySelector( 'input#orientationGamma' );

	var currentScreenOrientation = 360;

	var userIsEditing = false;

	function onUserIsEditingStart( e ) {
		userIsEditing = true;
	}

	function onUserIsEditingEnd( e ) {
		var alpha = parseFloat( orientationAlpha.value, 10 );
		var beta = parseFloat( orientationBeta.value, 10 );
		var gamma = parseFloat( orientationGamma.value, 10 );

		// Fit all inputs within acceptable interval
		alpha = alpha % 360;
		if ( beta < -180 ) beta = -180;
		if ( beta > 180 ) beta = 180;
		if ( gamma < -90 ) gamma = -90;
		if ( gamma > 90 ) gamma = 90;

		sendMessage(
			controller, {
				'action': 'setCoords',
				'data': {
					'alpha': alpha || 0,
					'beta': beta || 0,
					'gamma': gamma || 0
				}
			},
			selfUrl.origin
		);
	}

	function stopUserEditing( e ) {
		userIsEditing = false;
	}

	function stopUserEditingKey( e ) {
		var keyCode = e.which || e.keyCode;
		if ( keyCode !== 13 ) {
			return true;
		}
		// Force blur when return key is pressed
		var target = e.target;
		target.blur();
	}

	orientationAlpha.addEventListener( 'focus', onUserIsEditingStart, false );
	orientationAlpha.addEventListener( 'change', onUserIsEditingEnd, false );
	orientationAlpha.addEventListener( 'keypress', stopUserEditingKey, false );
	orientationAlpha.addEventListener( 'blur', stopUserEditing, false );

	orientationBeta.addEventListener( 'focus', onUserIsEditingStart, false );
	orientationBeta.addEventListener( 'change', onUserIsEditingEnd, false );
	orientationBeta.addEventListener( 'keypress', stopUserEditingKey, false );
	orientationBeta.addEventListener( 'blur', stopUserEditing, false );

	orientationGamma.addEventListener( 'focus', onUserIsEditingStart, false );
	orientationGamma.addEventListener( 'change', onUserIsEditingEnd, false );
	orientationGamma.addEventListener( 'keypress', stopUserEditingKey, false );
	orientationGamma.addEventListener( 'blur', stopUserEditing, false );

	var screenOrientationEl = document.querySelector( '#screenOrientation' );

	function sendGyroscopeEvent(a, b, g, orientation) {
		sendMessage(
			deviceFrame, {
				'type': 'page:deviceorientation',
				'alpha': a,
				'beta': b,
				'gamma': g,
				'orientation': orientation
			},
			origin
		);
	}
	
	var deviceOrientationChanged = false;

	var actions = {
		'newData': function( data ) {
			// Print deviceorientation data values in GUI
			if ( !userIsEditing ) {
				orientationAlpha.value = printDataValue( data.alpha );
				orientationBeta.value = printDataValue( data.beta );
				orientationGamma.value = printDataValue( data.gamma );
			}

			// Indicate that certain values are shown rounded for display purposes
			if ( orientationBeta.textContent === "180" ) orientationBeta.textContent += "*";
			if ( orientationGamma.textContent === "90" ) orientationGamma.textContent += "*";

			var roll = data[ 'roll' ] || 0;
			delete data[ 'roll' ]; // remove roll attribute from json
			
			var screenOrientation = currentScreenOrientation;
			if (screenOrientation == 360)
				screenOrientation = 0;
			if (screenOrientation == 90)
				screenOrientation = -90;
			if (screenOrientation == 270)
				screenOrientation = 90;

			// Post deviceorientation data to deviceFrame window
			sendGyroscopeEvent(data.alpha, data.beta, data.gamma, screenOrientation);

			// Apply roll compensation to deviceFrame
			//deviceFrame.style.webkitTransform = deviceFrame.style.msTransform = deviceFrame.style.transform = 'rotate(' + ( rot ) + 'deg) scale(' + scaleFactor + ')';
			//deviceContainer.style.webkitTransform = deviceContainer.style.msTransform = deviceContainer.style.transform = 'rotate(0 deg) scale(' + scaleFactor + ')';
		},
		'updateScreenOrientation': function( data ) {
			var requestedScreenOrientation = data.totalRotation % 360;
			var updateControls = data.updateControls;

			// Calculate rotation difference
			var currentRotation = currentScreenOrientation == 0 ? 360 : currentScreenOrientation;
			var rotationDiff = currentRotation - requestedScreenOrientation;

			// Update controller rendering
			sendMessage(
				controller, {
					'action': 'rotateScreen',
					'data': {
						'rotationDiff': -rotationDiff,
						'totalRotation': requestedScreenOrientation,
						'updateControls': updateControls
					}
				},
				selfUrl.origin
			);

			if ( ( ( currentRotation / 90 ) % 2 ) !== ( ( requestedScreenOrientation / 90 ) % 2 ) ) {
				$( 'button[data-rotate=true]' ).each( function() {
					width = $( this ).attr( 'data-viewport-width' );
					height = $( this ).attr( 'data-viewport-height' );
					$( this ).attr( 'data-viewport-width', height );
					$( this ).attr( 'data-viewport-height', width );
					if ( $( this ).hasClass( 'active' ) ) {
						$( this ).trigger( 'click' );
					}
				} );
			}

			// Update current screen orientation
			currentScreenOrientation = requestedScreenOrientation;
			
			var screenOrientation = currentScreenOrientation;
			if (screenOrientation == 360)
				screenOrientation = 0;
			if (screenOrientation == 90)
				screenOrientation = -90;
			if (screenOrientation == 270)
				screenOrientation = 90;
				
			// Notify emulated page that screen orientation has changed
			sendMessage(
				deviceFrame, {
					'action': 'screenOrientationChange',
					'orientation': screenOrientation
				},
				selfUrl.origin
			);
			
			screenOrientationEl.textContent = screenOrientation;
		},
		'lockScreenOrientation': function( data ) {
			// Post message to self to update screen orientation
			postMessage( JSON.stringify( {
				'action': 'updateScreenOrientation',
				'data': {
					'totalRotation': 360 - data,
					'updateControls': true
				}
			} ), selfUrl.origin );

			$( 'button.rotate' ).prop( "disabled", true ).attr( "title", "Screen Rotation is locked by page" );
			$( 'i', 'button.rotate' ).addClass( 'icon-lock' ).removeClass( 'icon-rotate-left' );
		},
		'unlockScreenOrientation': function( data ) {
			$( 'button.rotate' ).attr( "title", "Rotate the Screen" ).prop( "disabled", false );
			$( 'i', 'button.rotate' ).addClass( 'icon-rotate-left' ).removeClass( 'icon-lock' );
		}
	}

	// Relay deviceorientation events on to content iframe
	window.addEventListener( 'message', function( event ) {
		if ( event.origin != selfUrl.origin ) return;
		var json = JSON.parse( event.data );
		if ( !json.action || !actions[ json.action ] ) return;
		actions[ json.action ]( json.data );
	}, false );
	
	var resizeHandle = document.getElementById('resizeHandle');
	resizeHandle.addEventListener('mousedown', initialiseResize, false);

	function initialiseResize(e) {
		window.addEventListener('mousemove', startResizing, false);
		window.addEventListener('mouseup', stopResizing, false);
	}

	function startResizing(e) {
		deviceContainer.style.width = (e.clientX - deviceContainer.offsetLeft) + 'px';
		deviceContainer.style.height = (e.clientY - deviceContainer.offsetTop) + 'px';
		
		deviceFrame.style.minWidth = deviceContainer.style.width;
		deviceFrame.style.minHeight = deviceContainer.style.height;
		
		deviceFrame.style.width = deviceContainer.style.width;
		deviceFrame.style.height = deviceContainer.style.height;
	}
	function stopResizing(e) {
		window.removeEventListener('mousemove', startResizing, false);
		window.removeEventListener('mouseup', stopResizing, false);
	}
}
