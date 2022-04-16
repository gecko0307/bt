<script>
	import { onMount } from "svelte";
	
	let fonts = {};
	let config = {};
	
	async function apiRequest(data) {
		const res = await fetch("/api", {
			method: "POST",
			body: JSON.stringify(data)
		});
		return await res.json();
	}

	async function generate() {
		const res = await apiRequest({
			method: "generateFonts",
			config: config
		});
		console.log(res);
	}
	
	onMount(async () => {
		let res = await apiRequest({
			method: "fontsList"
		});
		fonts = res.data.fonts;
		console.log(fonts);

		res = await apiRequest({
			method: "fontsConfig"
		});
		config = res.data.config;
		console.log(config);
	});
</script>

<style>
</style>

<main>
	<div id="fonts">
		<!--
		{#each fonts.values() as font}
			<p>{font}</p>
		{/each}
		-->
		<p>{fonts}</p>
	</div>
	<div id="buttons">
		<input type="button" value="Generate" on:click={ generate }/>
	</div>
</main>
