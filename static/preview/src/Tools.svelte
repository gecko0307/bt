<script>
	import { onMount, createEventDispatcher } from "svelte";

	const dispatch = createEventDispatcher();

	async function apiRequest(data) {
		const res = await fetch("/api", {
			method: "POST",
			body: JSON.stringify(data)
		});
		return await res.json();
	}

	onMount(async () => {
		//
	});

	function openURL(url) {
		dispatch("open", { url });
	}
</script>

<main>
	<div class="section">
		<fieldset>
			<legend>Tools</legend>
			<input type="button" value="🖼️ Images" title="Image Optimizer" on:click={() => openURL("/images")}/>
			<input type="button" value="🗛 Fonts" title="Web Font Generator" on:click={() => openURL("/fonts")}/>
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