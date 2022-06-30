<script>
	import { createEventDispatcher } from "svelte";

	const dispatch = createEventDispatcher();

	export let bannerWidth;
	export let bannerHeight;

	async function apiRequest(data) {
		const res = await fetch("/api", {
			method: "POST",
			body: JSON.stringify(data)
		});
		return await res.json();
	}

	async function captureFallback() {
		const res = await apiRequest({
			method: "capture",
			width: bannerWidth,
			height: bannerHeight
		});
	}
</script>

<main>
	<div class="section">
		<fieldset>
			<legend>Fallback</legend>
			<!-- TODO: size mode: auto, container size -->
			<input type="button" value="📷 Capture Fallback" title="Capture fallback" on:click={captureFallback}/>
		</fieldset>
	</div>
	<div class="section">
		<fieldset>
			<legend>Video</legend>
			<!-- TODO -->
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
</style>