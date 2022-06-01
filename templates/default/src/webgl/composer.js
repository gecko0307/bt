import { gl } from "./webgl";

class ColorBuffer {
	constructor() {
		this.texture = null;
		this.resize();
	}
	
	createTexture(width, height) {
		const tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.bindTexture(gl.TEXTURE_2D, null);
		return tex;
	}
	
	resize() {
		if (this.texture && gl.isTexture(this.texture)) gl.deleteTexture(this.texture);
		this.texture = this.createTexture(gl.canvas.width, gl.canvas.height);
	}
}

class DepthBuffer {
	constructor() {
		this.renderbuffer = null;
		this.resize();
	}
	
	createRenderbuffer(width, height) {
		const buffer = gl.createRenderbuffer();
		gl.bindRenderbuffer(gl.RENDERBUFFER, buffer);
		gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
		gl.bindRenderbuffer(gl.RENDERBUFFER, null);
		return buffer;
	}
	
	resize() {
		if (this.valid()) gl.deleteRenderbuffer(this.renderbuffer);
		this.renderbuffer = this.createRenderbuffer(gl.canvas.width, gl.canvas.height);
	}
	
	valid() {
		return this.renderbuffer && gl.isRenderbuffer(this.renderbuffer);
	}
}

export class RenderPass {
	constructor(renderFunc, options) {
		this.renderFunc = renderFunc;
		this.options = options;
	}
}

export class Composer {
	constructor() {
		this.colorBuffers = [
			new ColorBuffer(), new ColorBuffer()
		];
		this.depthBuffer = new DepthBuffer();
		this.framebuffer = this.createFramebuffer();
		this.passes = [];
	}
	
	createFramebuffer() {
		const framebuffer = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.colorBuffers[0].texture, 0);
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depthBuffer.renderbuffer);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		return framebuffer;
	}
	
	addPass(renderFunc, options) {
		const pass = new RenderPass(renderFunc, options);
		this.passes.push(pass);
		return pass;
	}
	
	removePass(pass) {
		const index = this.passes.indexOf(pass);
		if (index > -1) {
			this.passes.splice(index, 1);
		}
	}
	
	resize() {
		this.colorBuffers[0].resize();
		this.colorBuffers[1].resize();
		this.depthBuffer.resize();
		this.framebuffer = this.createFramebuffer();
	}
	
	render() {
		if (!this.depthBuffer.valid()) return;
		
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
		
		let writeColorBuffer = 0;
		let readColorBuffer = 1;
		
		for (const pass of this.passes) {
			const writeTexture = this.colorBuffers[writeColorBuffer].texture;
			const readTexture = this.colorBuffers[readColorBuffer].texture;
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, writeTexture, 0);
			pass.renderFunc(readTexture, pass.options);
			
			// Swap color buffers
			const tmp = writeColorBuffer;
			writeColorBuffer = readColorBuffer;
			readColorBuffer = tmp;
		}
		
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		
		return this.colorBuffers[readColorBuffer].texture;
	}
}