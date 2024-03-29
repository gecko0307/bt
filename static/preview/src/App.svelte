<script>
	import { onMount } from "svelte";
	import { fade } from "svelte/transition";
	import "style/core.css";
	import Tabs from "./Tabs.svelte";
	import Tools from "./Tools.svelte";
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

	$: containerWidth = bannerWidthProp;
	$: containerHeight = bannerHeightProp;

	let defaultSize = "0x0";

	let gsap;
	let timelineIDs;
	let currentTimelineID;
	let currentTimeline;
	let timelineEnabled = true;
	let paused = false;
	let timelineProgress = 0.0;
	let bannerTime = 0.0;

	let displayTime;
	let displayDuration;

	let showOverlay = false;
	let inProgress = false;

	let showCapture = false;
	let capturedVideo = false;
	let captureFilename;

	let showBuild = false;
	let buildFilename;
	let buildDownloadFilename;
	let buildMessages = [];

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
			bannerDefaultWidth = bannerInternalContainer.offsetWidth;
			bannerDefaultHeight = bannerInternalContainer.offsetHeight;
			bannerResetSize();
		}

		//
		gsap = banner.contentWindow.gsap;
		if (gsap) {
			gsap.globalTimeline.pause();
			timelineIDs = Array.from(gsap.globalTimeline.getChildren().filter(c => c.constructor.name === "Timeline" && c.vars.id !== undefined).map(c => c.vars.id));
			currentTimeline = gsap.getById("MASTER");
			if (currentTimeline === undefined) {
				timelineEnabled = false;
			}
			else {
				currentTimelineID = "MASTER";
				console.log(currentTimeline.duration());
				if (currentTimeline.duration() === 0.0)
					timelineEnabled = false;
			}
			paused = !timelineEnabled;
		}
		else {
			timelineEnabled = false;
			paused = true;
		}
		printTime();
		if (timelineEnabled && currentTimeline) {
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
			bannerTime = timelineProgress * currentTimeline.duration();
			printTime();
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
		showBuild = false;
		showToolWindow = false;
		buildMessages = [];
	}

	function captureStart(event) {
		inProgress = true;
		showOverlay = true;
	}

	function captureReady(event) {
		inProgress = false;
		const capture = event.detail.capture;
		if (capture && capture.haveResult) {
			capturedVideo = capture.video;
			captureFilename = "/file?path=capture/" + capture.filename + "&" + new Date().getTime();
			showCapture = true;
		}
		else {
			showCapture = false;
			showOverlay = false;
		}
	}

	function buildStart(event) {
		inProgress = true;
		showOverlay = true;
	}

	function buildReady(event) {
		inProgress = false;
		const build = event.detail.build;
		if (build) {
			if (build.haveResult) {
				buildFilename = "/file?path=dist/" + build.filename + "&" + new Date().getTime();
				buildDownloadFilename = build.filename;
				if (build.log) {
					buildMessages = (build.log.errorMessages || []).concat(build.log.warningMessages || []);
				}
			}
			else {
				buildFilename = "";
				buildDownloadFilename = "";
				buildMessages = [
					{ output: event.detail.message || "Error" }
				];
			}
			showBuild = true;
		}
		else {
			showBuild = false;
			showOverlay = false;
		}
	}

	function togglePause() {
		if (!timelineEnabled) return;
		if (!paused) paused = true;
		else {
			paused = false;
			window.requestAnimationFrame(step);
		}
	}

	function timelineChange() {
		if (paused && timelineEnabled) {
			currentTimeline.progress(timelineProgress);
			bannerTime = timelineProgress * currentTimeline.duration();
			printTime();
		}
	}

	function printTime() {
		if (timelineEnabled) {
			const totalSeconds = timelineProgress * currentTimeline.duration();
			displayTime = formatTime(totalSeconds);
			displayDuration = formatTime(currentTimeline.duration());
		}
		else {
			displayTime = "00:00:00";
			displayDuration = "00:00:00";
		}
	}

	function formatTime(sec) {
		const minutes = Math.floor(sec / 60.0);
		const seconds = Math.floor(sec % 60.0);
		const sentiseconds = Math.floor(((sec % 60.0) % 1) * 100);
		const res =
			String(minutes).padStart(2, "0") + ":" + 
			String(seconds).padStart(2, "0") + ":" + 
			String(sentiseconds).padStart(2, "0");
		return res;
	}

	function timelineIDChange() {
		console.log(currentTimelineID);
		currentTimeline = gsap.getById(currentTimelineID);
		console.log(currentTimeline.duration());
		timelineEnabled = (currentTimeline.duration() !== 0.0);
		timelineProgress = 0.0;
		start = null;
		prevTime = 0.0;
		paused = true;
		printTime();
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
						containerWidth={bannerWidthProp}
						containerHeight={bannerHeightProp}
						bannerTime={bannerTime}
						on:start={captureStart}
						on:ready={captureReady}/>
				{:else if currentTab === "builder"}
					<Builder
						on:start={buildStart}
						on:ready={buildReady}/>
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
			<div id="timeline">
				<div class="row">
					<div class="widget">
						<p>Timeline</p>
						<select bind:value={currentTimelineID} on:change={timelineIDChange}>
							{#if timelineIDs !== undefined}
								{#each timelineIDs as id}
									<option value="{id}">{id}</option>
								{/each}
							{/if}
						</select>
						<input type="button" value="{paused? '▶️' : '⏸️'}" on:click={togglePause} disabled={!timelineEnabled}/>
					</div>
					<div class="widget fill">
						<p class="time"><b><span>{displayTime}</span></b> / <span>{displayDuration}</span></p>
						<input type="range" min="0" max="1" step="any" bind:value={timelineProgress} on:input={timelineChange} disabled={!timelineEnabled}>
					</div>
				</div>
			</div>
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
			{#if showBuild}
				<div id="build">
					<a href="{buildFilename}" download={buildDownloadFilename}><b>Download build</b></a><br>
					<a href="/build" target="_blank"><b>Show build</b></a>
					<div id="build_messages">
						{#each buildMessages as msg}
							<p>{msg.output}</p>
						{/each}
					</div>
				</div>
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

	.time {
		font-family: monospace;
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
		overflow: auto;
	}

	#overlay {
		position: fixed;
		box-sizing: border-box;
		width: 100%;
		height: 100%;
		margin: 0;
		padding: 0;
		text-align: center;
		display: flex;
		align-items: center;
		justify-content: center;
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
		max-width: 100%;
		max-height: 100%;
		left: -100%;
		right: -100%;
		margin-left: auto;
		margin-right: auto;
		top: -100%;
		bottom: -100%;
		margin-top: auto;
		margin-bottom: auto;
	}

	#build {
		display: inline-block;
		position: relative;
		box-sizing: border-box;
		padding: 15px;
		width: auto;
		height: auto;
		min-width: 300px;
		max-width: 75%;
		max-height: 50%;
		overflow-y: auto;
		font-family: sans-serif;
		font-size: 16px;
		text-align: center;
		line-height: 1.8em;
		color: #ffffff;
		background-color: #ffffff;
		border: 5px solid #5fccb6;
		border-radius: 10px;
	}

	#build a {
		color: #5fccb6;
	}

	#build_messages {
		text-align: left;
		margin-top: 10px;
	}
	#build_messages p {
		font-size: 14px;
		line-height: 1.3em;
		color: #ff0000;
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
