<script>
	import { createEventDispatcher } from "svelte";

	const dispatch = createEventDispatcher();

	export let bannerWidth;
	export let bannerHeight;
	export let containerWidth;
	export let containerHeight;

	let fallbackSizeMode = "banner";
	let videoSizeMode = "banner";
	let fps = 60;

	async function apiRequest(data) {
		const res = await fetch("/api", {
			method: "POST",
			body: JSON.stringify(data)
		});
		return await res.json();
	}

	async function captureFallback() {
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
	}

	async function captureVideo() {
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
			fps: fps,
			videoFilename: "video.mp4",
			videoCompressionRate: 1,
			videoDuration: undefined
		});
	}
</script>

<main>
	<div class="section">
		<fieldset>
			<legend>Fallback</legend>
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
			<p>
				<input type="number" size="45" bind:value={fps} min=1>
			</p>
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

	input[type=number] {
		margin-top: 5px;
		margin-bottom: 10px;
	}
</style>