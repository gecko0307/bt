<script>
	import { onMount } from "svelte";
	import "style/core.css";

	let sse;
	
	let images = [];
	let config = {};

	$: disabled = (images.length === 0);

	/*
	$: ext = filename.substring(filename.lastIndexOf(".") + 1);
	$: pngOnly = (ext !== "png");
	$: jpegOnly = (ext !== "jpg");
	$: svgOnly = (ext !== "svg");
	$: webpOnly = (ext !== "webp");
	*/

	function ext(filename) {
		return filename.substring(filename.lastIndexOf(".") + 1);
	}
	
	async function apiRequest(data) {
		const res = await fetch("/api", {
			method: "POST",
			body: JSON.stringify(data)
		});
		return await res.json();
	}

	async function updateImages() {
		const res = await apiRequest({
			method: "imagesList"
		});
		images = res.data.images;
		console.log(images);
	}

	async function updateConfig() {
		const res = await apiRequest({
			method: "imagesConfig"
		});
		config = res.data.config;
		console.log(config);
	}
	
	async function optimize() {
		const res = await apiRequest({
			method: "optimizeImages",
			config: config
		});
		if (res.ok && res.output) {
			//
		}
	}
	
	onMount(async () => {
		await updateImages();
		await updateConfig();

		sse = new EventSource("/sse?events=watcher");
		sse.onmessage = async function(event) {
			const data = JSON.parse(event.data);
			if (data.subsystem === "images") {
				console.log(data);
				await updateImages();
			}
		};
	});
</script>

<main>
	<h1>Image Optimizer</h1>
	<div id="images">
		{#if images.length > 0}
			{#each images as imageFile}
				{#if imageFile in config}
					<div class="image">
						<fieldset>
							<legend><b>{imageFile}</b></legend>
							<div class="row">
								<div class="thumb">
									<a href="/file?path=Images/{imageFile}" target="_blank">
										<img class="thumb_image" src="/file?path=Images/{imageFile}" alt="{imageFile}">
									</a>
								</div>
								<div class="widget">
									<p>Quality</p>
									<input type="range" min="0" max="100" step="1" bind:value={config[imageFile].quality}>
								</div>
								<div class="widget" style="padding-top: 14px">
									<input type="number" min="0" max="100" step="1" bind:value={config[imageFile].quality}>
								</div>
								<div class="widget" style="padding-top: 14px" class:jpegOnly={() => ext(imageFile) === "jpg"}>
									<label>
										<input type="checkbox" name="happy" bind:value={config[imageFile].options.compress.progressive}>Progressive
									</label>
								</div>
								<div class="widget" style="padding-top: 14px" class:jpegOnly={() => ext(imageFile) === "jpg"}>
									<label>
										<input type="checkbox" name="happy" bind:value={config[imageFile].options.compress.grayscale}>Grayscale
									</label>
								</div>
							</div>
						</fieldset>
					</div>
				{/if}
			{/each}
		{:else}
			<p>No images found in "Images" directory</p>
		{/if}
	</div>
	<div id="buttons">
		<input {disabled} type="button" value="⚙️ Optimize" on:click={ optimize }/>
	</div>
</main>

<style>
	main {
		padding: 10px;
		margin: 0;
		max-width: 1280px;
		margin-left: auto;
		margin-right: auto;
	}

	#images {
		margin-bottom: 20px;
	}

	.pngOnly, .jpegOnly, .svgOnly, .webpOnly {
		display: none;
	}

	.image {
		margin-top: 15px;
		margin-bottom: 10px;
	}

	.row {
		display: flex;
		flex-direction: row;
		gap: 10px;
	}

	.thumb {
		position: relative;
		width: 50px;
		height: 50px;
		padding: 0;
		border: 1px solid #379683;
		border-radius: 4px;
		overflow: hidden;
	}
	.thumb:hover {
		background-color: #edf5e1;
		cursor: pointer;
	}

	.thumb_image {
		position: absolute;
		margin: 0;
		width: auto;
		height: 90%;
		left: -100%;
		right: -100%;
		margin-left: auto;
		margin-right: auto;
		top: -100%;
		bottom: -100%;
		margin-top: auto;
		margin-bottom: auto;
	}

	input[type=range] {
		flex: auto;
		min-width: 200px;
	}

	input[type=checkbox] {
		margin-right: 5px;
	}
</style>
