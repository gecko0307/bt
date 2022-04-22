/*
Copyright (C) 2011 by Evan Wallace
Copyright (C) 2021 by Timur Gafarov

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

import { bannerW, bannerH } from "../main/global";

// The internal `gl` variable holds the current WebGL context.
let gl;

const GL = {
	// ### Initialization
	//
	// `GL.create()` creates a new WebGL context and augments it with
	// more methods. Uses the HTML canvas given in 'options' or creates
	// a new one if necessary. The alpha channel is disabled by default
	// because it usually causes unintended transparencies in the
	// canvas.
	create: function(options) {
		options = options || {};
		
		const pixelRatio = window.devicePixelRatio || 1;
		
		let canvas;
		if ("canvas" in options) {
			canvas = options.canvas;
			canvas.width = canvas.offsetWidth * pixelRatio;
			canvas.height = canvas.offsetHeight * pixelRatio;
		}
		else {
			canvas = document.createElement("canvas");
			canvas.width = (options.width || bannerW) * pixelRatio;
			canvas.height = (options.height || bannerH) * pixelRatio;
		}
		
		if (!("alpha" in options)) options.alpha = false;
		
		try { 
			gl = canvas.getContext("webgl", options);
		} catch (e) {
		}
		
		try { 
			gl = gl || canvas.getContext("experimental-webgl", options);
		} catch (e) {
		}
		
		if (!gl) throw new Error("WebGL is not supported!");
		
		gl.HALF_FLOAT_OES = 0x8D61;
		
		return gl;
	}
};

export { GL, gl };