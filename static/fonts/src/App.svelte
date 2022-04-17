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
	}

	async function clear() {
		config = {};
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
	</div>
	<div id="buttons">
		<input type="button" value="⚙️ Generate fonts.css" on:click={ generate }/>
		<input type="button" value="❌ Clear" on:click={ clear }/>
	</div>
</main>

<style>
	main {
		padding: 10px;
		margin: 0;
	}

	input[type=text] {
		height: 30px;
		width: 380px;
		padding: 0px 5px;
		margin: 5px 0px;
		background-color: #ffffff;
		background-image: none;
		border: 1px solid #cccccc;
		border-radius: 4px;
		font-family: sans-serif;
		font-size: 15px;
	}
	input[type=text]:focus {
		outline: none;
		border-color: #379683;
	}

	textarea {
		width: 380px;
		padding: 5px 5px;
		margin: 5px 0px;
		background-color: #ffffff;
		background-image: none;
		border: 1px solid #cccccc;
		border-radius: 4px;
		font-family: sans-serif;
		font-size: 15px;
	}
	textarea:focus {
		outline: none;
		border-color: #379683;
	}

	input[type=button] {
		width: auto;
		min-width: 40px;
		height: 35px;
		padding: 5px 5px;
		background-color: #fff;
		border: 1px solid #379683;
		border-radius: 4px;
		font-family: sans-serif;
		font-size: 15px;
	}
	input[type=button]:hover {
		background-color: #edf5e1;
		cursor: pointer;
	}
</style>
