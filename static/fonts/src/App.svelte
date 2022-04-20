<script>
	import { onMount } from "svelte";
	import "style/core.css";
	
	let fonts = {};
	let config = {};

	$: disabled = (Object.keys(fonts).length === 0);

	let output = "";
	
	async function apiRequest(data) {
		const res = await fetch("/api", {
			method: "POST",
			body: JSON.stringify(data)
		});
		return await res.json();
	}

	async function useFont(fontFile) {
		config[fontFile] = {
			text: "",
			engine: "fec",
			fontname: fonts[fontFile].name || ""
		};
		config = config;
	}

	async function removeFont(fontFile) {
		if (fontFile in config) delete config[fontFile];
		config = config;
	}

	async function generate() {
		const res = await apiRequest({
			method: "generateFonts",
			config: config
		});
		if (res.ok && res.output) {
			output = res.output;
		}
	}

	async function clear() {
		config = {};
		output = "";
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

<main>
	<h1>Web Font Generator</h1>
	<div id="fonts">
		{#if Object.keys(fonts).length > 0}
			{#each Object.keys(fonts) as fontFile}
				<div class="font">
					{#if fontFile in config}
						<h3>{fontFile}</h3>
						<p>CSS font-family:</p>
						<p><input type="text" size="45" bind:value={config[fontFile].fontname}></p>
						<p>Subsetting text:</p>
						<p><textarea rows="3" cols="45" bind:value={config[fontFile].text}></textarea></p>
						<p><input type="button" value="❌ Remove" on:click={ () => removeFont(fontFile) }/></p>
					{:else}
						<p><input type="button" value="➕ {fontFile}" on:click={ () => useFont(fontFile) }/></p>
					{/if}
				</div>
				<hr>
			{/each}
		{:else}
			<p>No fonts found in "Fonts" directory</p>
		{/if}
	</div>
	<div id="buttons">
		<p>
			<input {disabled} type="button" value="⚙️ Generate fonts.css" on:click={ generate }/>
			<input {disabled} type="button" value="❌ Remove all" on:click={ clear }/>
		</p>
	</div>
	{#if output.length > 0}
		<div id="output">
			<p><textarea class="output" rows="3" cols="45" bind:value={output}></textarea></p>
		</div>
	{/if}
</main>

<style>
	main {
		padding: 10px;
		margin: 0;
	}

	.output {
		width: 90%;
		height: 100px;
	}
</style>
