<script>
	import { createEventDispatcher } from "svelte";

	const dispatch = createEventDispatcher();

	export let bannerWidth;
	export let bannerHeight;
	export let containerWidth;
	export let containerHeight;
	export let bannerTime;

	let screenshotSizeMode = "banner";
	let fallbackSizeMode = "banner";
	let videoSizeMode = "banner";
	let screenshotFilename = "screenshot.png";
	let fps = 60;
	let videoFilename = "video.mp4";
	let videoCompressionRate = 1;
	let videoDuration = 0;
	let transparent = false;
	let zoom = 1;

	async function apiRequest(data) {
		const res = await fetch("/api", {
			method: "POST",
			body: JSON.stringify(data)
		});
		return await res.json();
	}

	async function captureScreenshot() {
		dispatch("start", { 
			message: "Capture screenshot..."
		});

		let width, height;
		if (screenshotSizeMode === "banner") {
			width = bannerWidth;
			height = bannerHeight;
		}
		else if (screenshotSizeMode === "container") {
			width = containerWidth;
			height = containerHeight;
		}

		console.log(width, height);

		const res = await apiRequest({
			method: "capture",
			screenshot: true,
			transparent: transparent,
			zoom: zoom,
			screenshotTime: bannerTime,
			screenshotFilename: screenshotFilename,
			width: width,
			height: height
		});

		dispatch("ready", { 
			...res,
			capture: {
				haveResult: true,
				video: false,
				screenshot: true,
				filename: screenshotFilename,
				width, height
			}
		});
	}

	async function captureFallback() {
		dispatch("start", { 
			message: "Capture fallback..."
		});

		let width, height;
		if (fallbackSizeMode === "banner") {
			width = bannerWidth;
			height = bannerHeight;
		}
		else if (fallbackSizeMode === "container") {
			width = containerWidth;
			height = containerHeight;
		}

		const res = await apiRequest({
			method: "capture",
			width: width,
			height: height
		});

		dispatch("ready", { 
			...res,
			capture: {
				haveResult: res.frames.length > 0,
				video: false,
				filename: "fallback.gif",
				width, height
			}
		});
	}

	async function captureVideo() {
		dispatch("start", { 
			message: "Capture video..."
		});

		let width, height;
		if (videoSizeMode === "banner") {
			width = bannerWidth;
			height = bannerHeight;
		}
		else if (videoSizeMode === "container") {
			width = containerWidth;
			height = containerHeight;
		}

		const res = await apiRequest({
			method: "capture",
			video: true,
			width: width,
			height: height,
			videoFps: fps,
			videoFilename: videoFilename,
			videoCompressionRate: videoCompressionRate,
			videoDuration: videoDuration
		});

		dispatch("ready", {
			...res,
			capture: {
				haveResult: true,
				video: true,
				filename: videoFilename,
				width, height, 
			}
		});
	}
</script>

<main>
	<div class="section">
		<fieldset>
			<legend>Screenshot</legend>
			<p>Size</p>
			<p>
				<select bind:value={screenshotSizeMode}>
					<option value="banner" selected>From banner</option>
					<option value="container">From container</option>
				</select>
			</p>
			<p>Filename</p>
			<p><input type="text" size="45" style="width:200px" bind:value={screenshotFilename}></p>
			<p>Zoom</p>
			<p><input type="number" size="45" bind:value={zoom} min=1 step=1></p>
			<label>
				<input type="checkbox" bind:checked={transparent} />
				Transparent background
			</label>
			<p><input type="button" value="📷 Capture Screenshot" title="Capture screenshot" on:click={captureScreenshot}/></p>
		</fieldset>
	</div>
	<div class="section">
		<fieldset>
			<legend>Fallback (GIF + PSD)</legend>
			<p>Size</p>
			<p>
				<select bind:value={fallbackSizeMode}>
					<option value="banner" selected>From banner</option>
					<option value="container">From container</option>
				</select>
			</p>
			<p><input type="button" value="📷 Capture Fallback" title="Capture fallback" on:click={captureFallback}/></p>
		</fieldset>
	</div>
	<div class="section">
		<fieldset>
			<legend>Video</legend>
			<p>Size</p>
			<p>
				<select bind:value={videoSizeMode}>
					<option value="banner" selected>From banner</option>
					<option value="container">From container</option>
				</select>
			</p>
			<p>FPS</p>
			<p><input type="number" size="45" bind:value={fps} min=1></p>
			<p>Duration (0 = autodetect)</p>
			<p><input type="number" size="45" style="width:200px" bind:value={videoDuration} min=0 step=1></p>
			<p>Filename</p>
			<p><input type="text" size="45" style="width:200px" bind:value={videoFilename}></p>
			<p>Compression rate</p>
			<p><input type="number" size="45" style="width:200px" bind:value={videoCompressionRate} min=0 step=0.1></p>
			<input type="button" value="🎥 Capture Video" title="Capture video" on:click={captureVideo}/>
		</fieldset>
	</div>
</main>

<style>
	main {
		position: absolute;
		box-sizing: border-box;
		padding: 10px;
		margin: 0;
		width: 100%;
		height: 100%;
	}

	.section {
		margin-top: 15px;
		margin-bottom: 20px;
	}

	select {
		margin-top: 5px;
		margin-bottom: 10px;
	}

	input[type=text] {
		margin-top: 5px;
		margin-bottom: 10px;
	}

	input[type=number] {
		margin-top: 5px;
		margin-bottom: 10px;
	}

	input[type=checkbox] {
		margin-top: 5px;
		margin-bottom: 15px;
	}
</style>