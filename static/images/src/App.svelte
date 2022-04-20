<script>
	import { onMount } from "svelte";
	import "style/core.css";
	
	$: disabled = true;
	
	async function apiRequest(data) {
		const res = await fetch("/api", {
			method: "POST",
			body: JSON.stringify(data)
		});
		return await res.json();
	}
	
	function optimize() {
	}
	
	onMount(async () => {
	});
</script>

<main>
	<h1>Image Optimizer</h1>
	<div id="images">
	</div>
	<div id="buttons">
		<input {disabled} type="button" value="⚙️ Optimize" on:click={ optimize }/>
	</div>
</main>

<style>
	main {
		padding: 10px;
		margin: 0;
	}
</style>
