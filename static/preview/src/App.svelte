<script>
	import { onMount } from "svelte";
	import { fade } from "svelte/transition";
	import "style/core.css";
	import Tabs from "./Tabs.svelte";
	import Tools, { timerStart } from "./Tools.svelte";
	import Capturer from "./Capturer.svelte";
	import Builder from "./Builder.svelte";
	import Events from "./Events.svelte";
	
	let sse;

	const screens = {
		iphone_se: { width: 375, height: 667 },
		iphone_xr: { width: 414, height: 896 },
		iphone_12_pro: { width: 390, height: 844 }
	};

	let bannerContainer;
	let banner;
	let bannerURL = "/index.html";
	let bannerInternalContainer;
	let bannerDefaultWidth = 240;
	let bannerDefaultHeight = 400;
	let bannerWidth = bannerDefaultWidth;
	let bannerHeight = bannerDefaultHeight;
	let bannerWidthProp = bannerWidth;
	let bannerHeightProp = bannerHeight;
	let bannerDevice = "default";

	let gsap;
	let timelines;
	let currentTimelineID = "MASTER";
	let currentTimeline;
	let timelineEnabled = true;
	let paused = false;
	let timelineProgress = 0.0;

	let showOverlay = false;
	let inProgress = false;

	let showCapture = false;
	let capturedVideo = false;
	let captureFilename;

	let showToolWindow = false;
	let toolFrame;
	let toolURL;
	
	let observer;

	// tools, capturer, builder, events
	let currentTab = "tools";

	async function apiRequest(data) {
		const res = await fetch("/api", {
			method: "POST",
			body: JSON.stringify(data)
		});
		return await res.json();
	}
	
	onMount(async () => {
		sse = new EventSource("/sse?events=watcher");
		sse.onmessage = async function(event) {
			const data = JSON.parse(event.data);
		};
		sse.onerror = function(error) {
			console.error("EventSource failed: ", error);
		};

		banner.onload = bannerOnLoad;

		observer = new ResizeObserver(mutations => {
			bannerWidth = mutations[0].contentRect.width;
			bannerHeight = mutations[0].contentRect.height;
			bannerWidthProp = bannerWidth;
			bannerHeightProp = bannerHeight;
		});
		observer.observe(bannerContainer);
	});

	function bannerOnLoad(event) {
		console.log("Banner loaded");
		const bannerWindow = banner.contentWindow;
		const bannerDocument = bannerWindow.document;
		bannerInternalContainer = bannerDocument.getElementById("container");
		if (bannerInternalContainer) {
			console.log(bannerInternalContainer.offsetWidth, bannerInternalContainer.offsetHeight);
			bannerDefaultWidth = bannerInternalContainer.offsetWidth;
			bannerDefaultHeight = bannerInternalContainer.offsetHeight;
			bannerResetSize();
		}

		//
		gsap = banner.contentWindow.gsap;
		timelines = Array.from(gsap.globalTimeline.getChildren().filter(c => c.constructor.name === "Timeline" && c.vars.id !== undefined));
		currentTimeline = gsap.getById("MASTER");
		if (currentTimeline === undefined) {
			if (timelines.length > 0) currentTimeline = timelines[0];
			else {
				timelineEnabled = false;
			}
		}
		paused = !timelineEnabled;
		if (!paused) {
			currentTimeline.pause();
			window.requestAnimationFrame(step);
		}

		// 
		const style = bannerDocument.createElement("style");
		bannerDocument.head.appendChild(style);
		style.type = "text/css";
		style.textContent = "#__bs_notify__ { opacity: 0; } #link, #container { left: 0; right: auto; margin: 0; }";
		bannerDocument.querySelectorAll(".dev, .gs-dev-tools, [preview]").forEach(elem => elem.remove());
	}

	let start = null;
	let prevTime = 0.0;
	function step(timestamp) {
		if (!start) start = timestamp;
		const time = (timestamp - start);
		const timeStep = (time - prevTime) / 1000;
		prevTime = time;
		if (currentTimeline) {
			timelineProgress += timeStep / currentTimeline.duration();

			if (timelineProgress >= 1.0) {
				timelineProgress = 0.0;
				start = null;
				prevTime = 0.0;
			}

			currentTimeline.progress(timelineProgress);
		}
		if (!paused) window.requestAnimationFrame(step);
		else { 
			start = null;
			prevTime = 0.0;
		}
	}

	function bannerSizeChange(event) {
		observer.disconnect();
		bannerContainer.style.width = bannerWidthProp + "px";
		bannerContainer.style.height = bannerHeightProp + "px";
		observer.observe(bannerContainer);
	}

	function bannerSrcKeyPress(event) {
		if (event.charCode === 13) {
			loadBanner();
		}
	}
	
	function loadBanner() {
		banner.src = "";
		banner.src = bannerURL;
		timerStart();
	}

	function bannerDeviceChange() {
		let screen = screens[bannerDevice];
		bannerWidthProp = screen.width;
		bannerHeightProp = screen.height;
		bannerContainer.style.width = bannerWidthProp + "px";
		bannerContainer.style.height = bannerHeightProp + "px";
	}

	function bannerResetSize() {
		bannerWidthProp = bannerDefaultWidth;
		bannerHeightProp = bannerDefaultHeight;
		bannerContainer.style.width = bannerWidthProp + "px";
		bannerContainer.style.height = bannerHeightProp + "px";
	}

	function tabChange(event) {
		currentTab = event.detail.tab;
	}

	function toolOpen(event) {
		toolURL = event.detail.url;
		console.log(toolURL);
		showOverlay = true;
		showToolWindow = true;
	}

	function closeOverlay() {
		showOverlay = false;
		showCapture = false;
		showToolWindow = false;
	}

	function captureStart(event) {
		inProgress = true;
		showOverlay = true;
	}

	function captureReady(event) {
		const capture = event.detail.capture;
		capturedVideo = capture.video;
		captureFilename = "/file?path=capture/" + capture.filename;
		inProgress = false;
		showCapture = true;
	}

	function togglePause() {
		if (!paused) paused = true;
		else {
			paused = false;
			window.requestAnimationFrame(step);
		}
	}

	function timelineChange() {
		if (paused) {
			currentTimeline.progress(timelineProgress);
		}
	}
</script>

<main>
	<div id="ui">
		<div id="control">
			<Tabs on:change={tabChange}/>
			<div id="control_page">
				{#if currentTab === "tools"}
					<Tools on:open={toolOpen}/>
				{:else if currentTab === "capturer"}
					<Capturer 
						bannerWidth={bannerDefaultWidth}
						bannerHeight={bannerDefaultHeight}
						containerWidth={banner.offsetWidth}
						containerHeight={banner.offsetHeight}
						on:start={captureStart}
						on:ready={captureReady}/>
				{:else if currentTab === "builder"}
					<Builder/>
				{:else if currentTab === "events"}
					<Events/>
				{/if}
			</div>
		</div>
		<div id="preview">
			<div id="resize_area">
				<div id="banner_container" bind:this={bannerContainer}>
					<iframe title="banner" id="banner" bind:this={banner} src="/index.html" frameborder="0" scrolling="no"></iframe>
				</div>
			</div>
			<div id="size_info">
				<div class="row">
					<div class="widget">
						<p>Banner URL</p>
						<input type="text" size="45" style="width:200px" bind:value={bannerURL} on:keypress={ bannerSrcKeyPress }>
						<input type="button" value="↻" on:click={loadBanner}/>
					</div>
					<div class="widget">
						<p>Width</p>
						<input type="number" size="45" bind:value={bannerWidthProp} min=0 on:input={bannerSizeChange}>
					</div>
					<div class="widget">
						<p>Height</p>
						<input type="number" size="45" bind:value={bannerHeightProp} min=0 on:input={bannerSizeChange}>
					</div>
					<div class="widget">
						<p>Device</p>
						<select bind:value={bannerDevice} on:change={bannerDeviceChange}>
							<option value="iphone_se">iPhone SE</option>
							<option value="iphone_xr">iPhone XR</option>
							<option value="iphone_12_pro">iPhone 12 Pro</option>
						</select>
						<input type="button" value="Reset" on:click={bannerResetSize}/>
					</div>
				</div>
			</div>
			{#if timelines && currentTimeline}
				<div id="timeline">
					<div class="row">
						<div class="widget">
							<p>Timeline</p>
							<select bind:value={currentTimelineID}>
								{#each timelines as tl}
									<option value="{tl.vars.id}">{tl.vars.id}</option>
								{/each}
							</select>
							<input type="button" value="{paused? '▶️' : '⏸️'}" on:click={togglePause} disabled={!timelineEnabled}/>
						</div>
						<div class="widget fill">
							<p>Progress</p>
							<input type="range" min="0" max="1" step="any" bind:value={timelineProgress} on:input={timelineChange}>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
	{#if showOverlay}
		<div id="overlay" transition:fade="{{ duration: 100 }}">
			<div id="overlay-bg"></div>
			{#if inProgress}
				<img id="preloader" src="images/preloader.svg" alt="preloader" transition:fade={{ duration: 100 }}>
			{/if}
			{#if showCapture}
				{#if capturedVideo}
					<video id="video" controls transition:fade={{ duration: 100 }}>
						<track kind="captions">
						<source id="video_src" type="video/mp4" src="{captureFilename}">
					</video>
				{:else}
					<img id="fallback" src="{captureFilename}" alt="Fallback">
				{/if}
			{/if}
			{#if showToolWindow}
				<div id="tool_frame_container">
					<iframe title="Tool Frame" id="tool_frame" bind:this={toolFrame} src="{toolURL}" frameborder="0"></iframe>
				</div>
			{/if}
			<div id="close" on:click={ closeOverlay } transition:fade={{ duration: 100 }}>
				<img id="close-bg" src="images/close.svg" alt="close">
			</div>
		</div>
	{/if}
</main>

<style>
	main {
		position: absolute;
		box-sizing: border-box;
		padding: 0;
		margin: 0;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	#ui {
		position: absolute;
		box-sizing: border-box;
		padding: 0;
		margin: 0;
		width: 100%;
		height: 100%;
	}

	#preview {
		position: absolute;
		box-sizing: border-box;
		padding: 0;
		margin: 0;
		width: auto;
		left: 0;
		right: 300px;
		height: 100%;
		overflow: auto;
		background-color: #cccccc;
	}

	#timeline {
		position: absolute;
		box-sizing: border-box;
		padding: 10px;
		margin: 0;
		width: 100%;
		height: 74px;
		top: auto;
		bottom: 0;
		background-color: #ffffff;
	}

	#size_info {
		position: absolute;
		box-sizing: border-box;
		margin: 0;
		width: 100%;
		height: 74px;
		background-color: #ffffff;
		padding: 10px;
	}

	#resize_area {
		position: absolute;
		box-sizing: border-box;
		padding: 0;
		margin: 0;
		width: 100%;
		height: auto;
		top: 74px;
		bottom: 74px;
		overflow: auto;
	}

	#banner_container {
		position: absolute;
		box-sizing: border-box;
		padding: 0;
		margin: 0;
		width: 240px;
		height: 400px;
		left: -100%;
		right: -100%;
		margin-left: auto;
		margin-right: auto;
		top: -100%;
		bottom: -100%;
		margin-top: auto;
		margin-bottom: auto;
		/* top: 42px; */
		background-color: #ffffff;
		touch-action: none;
		resize: both;
		overflow: hidden;
		box-shadow: 0 0 10px rgba(0,0,0,0.2);
	}

	#banner {
		position: absolute;
		box-sizing: border-box;
		width: 100%;
		height: 100%;
		overflow: hidden;
		left: 0; right: 0;
		top: 0; bottom: 0;
		margin: auto;
		opacity: 1;
	}

	input[type=button] {
		width: auto;
		min-width: 30px;
		height: 30px;
		padding: 5px 5px;
		margin-right: 5px;
		background-color: #ffffff;
		border: 1px solid #379683;
		border-radius: 4px;
		font-family: sans-serif;
		font-size: 15px;
		float: none;
	}

	input[type=number] {
		margin: 5px 0px;
	}

	.widget.fill {
		flex-grow: 1;
	}

	input[type=range] {
		margin: 10px 0px;
		width: 100%;
	}

	select {
		margin: 5px 0px;
	}

	#control {
		position: absolute;
		box-sizing: border-box;
		margin: 0;
		width: 300px;
		height: 100%;
		left: auto;
		right: 0;
		background-color: #ffffff;
		border-left: 1px solid #cccccc;
	}

	#control_page {
		position: absolute;
		box-sizing: border-box;
		margin: 0;
		width: 300px;
		height: auto;
		top: 48px;
		bottom: 0;
	}

	#overlay {
		position: fixed;
		box-sizing: border-box;
		width: 100%;
		height: 100%;
		margin: 0;
		padding: 0;
	}

	#overlay-bg {
		position: fixed;
		box-sizing: border-box;
		width: 100%;
		height: 100%;
		background-color: #000000;
		opacity: 0.6;
	}

	#preloader {
		position: fixed;
		width: 10vh;
		height: auto;
		left: -100%;
		right: -100%;
		margin-left: auto;
		margin-right: auto;
		top: -100%;
		bottom: -100%;
		margin-top: auto;
		margin-bottom: auto;
	}

	#fallback, #video {
		position: fixed;
		box-sizing: border-box;
		margin: 0;
		padding: 0;
		width: auto;
		height: auto;
		left: -100%;
		right: -100%;
		margin-left: auto;
		margin-right: auto;
		top: -100%;
		bottom: -100%;
		margin-top: auto;
		margin-bottom: auto;
	}

	#tool_frame_container {
		position: fixed;
		box-sizing: border-box;
		margin: 0;
		padding: 0;
		overflow: hidden;
		width: 95%;
		max-width: 1440px;
		left: -100%;
		right: -100%;
		margin-left: auto;
		margin-right: auto;
		height: auto;
		top: 100px;
		bottom: 100px;
		border: 5px solid #5fccb6;
		border-radius: 10px;
	}

	#tool_frame {
		position: absolute;
		box-sizing: border-box;
		width: 100%;
		height: 100%;
		left: 0; right: 0;
		top: 0; bottom: 0;
		margin: auto;
		opacity: 1;
		overflow-x: hidden;
		overflow-y: auto;
	}

	#close {
		position: fixed;
		width: 32px;
		height: 32px;
		left: auto;
		right: 20px;
		top: 20px;
		cursor: pointer;
		/* border: 1px solid white; */
	}
	#close-bg {
		width: 100%;
		height: 100%;
	}
</style>
