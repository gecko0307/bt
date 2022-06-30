<script>
	import { createEventDispatcher } from "svelte";

	const dispatch = createEventDispatcher();

	async function apiRequest(data) {
		const res = await fetch("/api", {
			method: "POST",
			body: JSON.stringify(data)
		});
		return await res.json();
	}

	async function build() {
		const res = await apiRequest({
			method: "build"
			// TODO: build options
		});
	}
</script>

<main>
	<div class="section">
		<fieldset>
			<legend>Build</legend>
			<input type="button" value="📦 Build banner" title="Build banner" on:click={build}/>
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