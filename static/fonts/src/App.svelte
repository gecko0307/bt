<script>
	import { onMount } from "svelte";
	
	let fonts = [];
	
	async function apiRequest(data) {
		const res = await fetch("/api", {
			method: "POST",
			body: JSON.stringify(data)
		});
		return await res.json();
	}
	
	onMount(async () => {
		const res = await apiRequest({
			method: "fontsList"
		});
		fonts = res.data.fonts;
	});
</script>

<style>
</style>

<main>
	<div id="fonts">
		{#each fonts as font}
			<p>{font}</p>
		{/each}
	</div>
</main>
