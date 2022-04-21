<script>
	import { onMount } from "svelte";
	import "style/core.css";
	import ImageSettings from "./ImageSettings.svelte";

	let sse;
	
	let images = [];
	let config = {};

	$: disabled = (images.length === 0);
	
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
							<ImageSettings filename={imageFile} data={config[imageFile]} />
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

	.image {
		margin-top: 15px;
		margin-bottom: 10px;
	}
</style>
