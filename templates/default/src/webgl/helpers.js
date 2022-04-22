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

import { Vector } from "./vector";
import { Matrix } from "./matrix";
import { Mesh } from "./mesh";
import { Shader } from "./shader";

// A value to bitwise-or with new enums to make them distinguishable from the
// standard WebGL enums.
const ENUM = 0x12340000;

const hasFloat32Array = (typeof Float32Array != "undefined");

// ### Matrix stack
//
// Implement the OpenGL modelview and projection matrix stacks, along with some
// other useful GLU matrix functions.

function addMatrixStack(gl) {
	gl.MODELVIEW = ENUM | 1;
	gl.PROJECTION = ENUM | 2;
	let tempMatrix = new Matrix();
	let resultMatrix = new Matrix();
	gl.modelviewMatrix = new Matrix();
	gl.projectionMatrix = new Matrix();
	let modelviewStack = [];
	let projectionStack = [];
	let matrix, stack;
	gl.matrixMode = function(mode) {
		switch (mode) {
			case gl.MODELVIEW:
				matrix = 'modelviewMatrix';
				stack = modelviewStack;
				break;
			case gl.PROJECTION:
				matrix = 'projectionMatrix';
				stack = projectionStack;
				break;
			default:
				throw new Error('invalid matrix mode ' + mode);
		}
	};
	gl.loadIdentity = function() {
		Matrix.identity(gl[matrix]);
	};
	gl.loadMatrix = function(m) {
		let from = m.m, to = gl[matrix].m;
		for (let i = 0; i < 16; i++) {
			to[i] = from[i];
		}
	};
	gl.multMatrix = function(m) {
		gl.loadMatrix(Matrix.multiply(gl[matrix], m, resultMatrix));
	};
	gl.perspective = function(fov, aspect, near, far) {
		gl.multMatrix(Matrix.perspective(fov, aspect, near, far, tempMatrix));
	};
	gl.frustum = function(l, r, b, t, n, f) {
		gl.multMatrix(Matrix.frustum(l, r, b, t, n, f, tempMatrix));
	};
	gl.ortho = function(l, r, b, t, n, f) {
		gl.multMatrix(Matrix.ortho(l, r, b, t, n, f, tempMatrix));
	};
	gl.scale = function(x, y, z) {
		gl.multMatrix(Matrix.scale(x, y, z, tempMatrix));
	};
	gl.translate = function(x, y, z) {
		gl.multMatrix(Matrix.translate(x, y, z, tempMatrix));
	};
	gl.rotate = function(a, x, y, z) {
		gl.multMatrix(Matrix.rotate(a, x, y, z, tempMatrix));
	};
	gl.lookAt = function(ex, ey, ez, cx, cy, cz, ux, uy, uz) {
		gl.multMatrix(Matrix.lookAt(ex, ey, ez, cx, cy, cz, ux, uy, uz, tempMatrix));
	};
	gl.pushMatrix = function() {
		stack.push(Array.prototype.slice.call(gl[matrix].m));
	};
	gl.popMatrix = function() {
		let m = stack.pop();
		gl[matrix].m = hasFloat32Array ? new Float32Array(m) : m;
	};
	gl.project = function(objX, objY, objZ, modelview, projection, viewport) {
		modelview = modelview || gl.modelviewMatrix;
		projection = projection || gl.projectionMatrix;
		viewport = viewport || gl.getParameter(gl.VIEWPORT);
		let point = projection.transformPoint(modelview.transformPoint(new Vector(objX, objY, objZ)));
		return new Vector(
			viewport[0] + viewport[2] * (point.x * 0.5 + 0.5),
			viewport[1] + viewport[3] * (point.y * 0.5 + 0.5),
			point.z * 0.5 + 0.5
		);
	};
	gl.unProject = function(winX, winY, winZ, modelview, projection, viewport) {
		modelview = modelview || gl.modelviewMatrix;
		projection = projection || gl.projectionMatrix;
		viewport = viewport || gl.getParameter(gl.VIEWPORT);
		let point = new Vector(
			(winX - viewport[0]) / viewport[2] * 2 - 1,
			(winY - viewport[1]) / viewport[3] * 2 - 1,
			winZ * 2 - 1
		);
		return Matrix.inverse(Matrix.multiply(projection, modelview, tempMatrix), resultMatrix).transformPoint(point);
	};
	gl.matrixMode(gl.MODELVIEW);
}


// ### Immediate mode
//
// Provide an implementation of OpenGL's deprecated immediate mode. This is
// depricated for a reason: constantly re-specifying the geometry is a bad
// idea for performance. You should use a `GL.Mesh` instead, which specifies
// the geometry once and caches it on the graphics card. Still, nothing
// beats a quick `gl.begin(gl.POINTS); gl.vertex(1, 2, 3); gl.end();` for
// debugging. This intentionally doesn't implement fixed-function lighting
// because it's only meant for quick debugging tasks.

function addImmediateMode(gl) {
	let immediateMode = {
		mesh: new Mesh({ coords: true, colors: true, triangles: false }),
		mode: -1,
		coord: [0, 0, 0, 0],
		color: [1, 1, 1, 1],
		pointSize: 1,
		shader: new Shader('\
			uniform float pointSize;\
			varying vec4 color;\
			varying vec4 coord;\
			void main() {\
				color = gl_Color;\
				coord = gl_TexCoord;\
				gl_Position = gl_ModelViewProjectionMatrix * gl_Vertex;\
				gl_PointSize = pointSize;\
			}\
		', '\
			uniform sampler2D texture;\
			uniform float pointSize;\
			uniform bool useTexture;\
			varying vec4 color;\
			varying vec4 coord;\
			void main() {\
				gl_FragColor = color;\
				if (useTexture) gl_FragColor *= texture2D(texture, coord.xy);\
			}\
		')
	};
	gl.pointSize = function(pointSize) {
		immediateMode.shader.uniforms({ pointSize: pointSize });
	};
	gl.begin = function(mode) {
		if (immediateMode.mode != -1) throw new Error('mismatched gl.begin() and gl.end() calls');
		immediateMode.mode = mode;
		immediateMode.mesh.colors = [];
		immediateMode.mesh.coords = [];
		immediateMode.mesh.vertices = [];
	};
	gl.color = function(r, g, b, a) {
		immediateMode.color = (arguments.length == 1) ? r.toArray().concat(1) : [r, g, b, a || 1];
	};
	gl.texCoord = function(s, t) {
		immediateMode.coord = (arguments.length == 1) ? s.toArray(2) : [s, t];
	};
	gl.vertex = function(x, y, z) {
		immediateMode.mesh.colors.push(immediateMode.color);
		immediateMode.mesh.coords.push(immediateMode.coord);
		immediateMode.mesh.vertices.push(arguments.length == 1 ? x.toArray() : [x, y, z]);
	};
	gl.end = function() {
		if (immediateMode.mode == -1) throw new Error('mismatched gl.begin() and gl.end() calls');
		immediateMode.mesh.compile();
		immediateMode.shader.uniforms({
			useTexture: !!gl.getParameter(gl.TEXTURE_BINDING_2D)
		}).draw(immediateMode.mesh, immediateMode.mode);
		immediateMode.mode = -1;
	};
}

// ### Animation
//
// Call `gl.animate()` to provide an animation loop that repeatedly calls
// `gl.onupdate()` and `gl.ondraw()`.

function addAnimation(gl) {
	gl.animate = function() {
		var post =
			window.requestAnimationFrame ||
			window.mozRequestAnimationFrame ||
			window.webkitRequestAnimationFrame ||
			function(callback) { setTimeout(callback, 1000 / 60); };
		var time = new Date().getTime();
		var context = gl;
		function update() {
			gl = context;
			var now = new Date().getTime();
			if (gl.onupdate) gl.onupdate((now - time) / 1000);
			if (gl.ondraw) gl.ondraw();
			post(update);
			time = now;
	  	}
	  	update();
	};
}

export default { addMatrixStack, addImmediateMode, addAnimation };
