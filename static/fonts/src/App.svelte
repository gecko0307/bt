<script>
	import { onMount } from "svelte";
	import "style/core.css";
	
	let sse;

	let fonts = {};
	let config = {};

	$: disabled = (Object.keys(config).length === 0);

	let output = "";
	
	async function apiRequest(data) {
		const res = await fetch("/api", {
			method: "POST",
			body: JSON.stringify(data)
		});
		return await res.json();
	}

	async function updateFonts() {
		const res = await apiRequest({
			method: "fontsList"
		});
		fonts = res.data.fonts;
		console.log(fonts);
	}

	async function updateConfig() {
		const res = await apiRequest({
			method: "fontsConfig"
		});
		config = res.data.config;
		console.log(config);
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

	async function clearFont(fontFile) {
		if (fontFile in config) {
			config[fontFile].text = "";
		}
	}

	function isFontNameValid(fontName) {
		return fontName.length > 0 && fontName.length < 32;
	}

	function isSubsetTextValid(text) {
		return text.length > 0;
	}

	async function isConfigValid() {
		for (const fontFile of Object.keys(config)) {
			if (!isFontNameValid(config[fontFile].fontname)) return false;
			if (!isSubsetTextValid(config[fontFile].text)) return false;
		}
		return true;
	}

	async function generate() {
		if (await isConfigValid()) {
			const res = await apiRequest({
				method: "generateFonts",
				config: config
			});
			if (res.ok && res.output) {
				output = res.output;
			}
		}
	}

	async function clear() {
		config = {};
		output = "";
	}
	
	onMount(async () => {
		await updateFonts();
		await updateConfig();

		sse = new EventSource("/sse?events=watcher");
		sse.onmessage = async function(event) {
			const data = JSON.parse(event.data);
			if (data.subsystem === "fonts") {
				await updateFonts();
			}
		};
		sse.onerror = function(error) {
			console.error("EventSource failed: ", error);
		};
	});
</script>

<main>
	<h1>Web Font Generator</h1>
	<div id="fonts">
		{#if Object.keys(fonts).length > 0}
			{#each Object.keys(fonts) as fontFile}
				<div class="font">
					<fieldset>
						<legend><b><span class="font-icon">🗛</span> {fontFile}</b></legend>
						{#if fontFile in config}
							<p>CSS font-family:</p>
							<p><input type="text" size="45" class:invalid={!isFontNameValid(config[fontFile].fontname)} bind:value={config[fontFile].fontname}></p>
							<p>Subsetting text:</p>
							<p><textarea rows="3" cols="45" class:invalid={!isSubsetTextValid(config[fontFile].text)} bind:value={config[fontFile].text}></textarea></p>
							<p><input type="button" value="❌ Remove" on:click={ () => removeFont(fontFile) }/></p>
							<p><input type="button" value="🧹 Clear" on:click={ () => clearFont(fontFile) }/></p>
						{:else}
							<p><input type="button" value="➕ Use font" on:click={ () => useFont(fontFile) }/></p>
						{/if}
					</fieldset>
				</div>
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
		max-width: 1024px;
		margin-left: auto;
		margin-right: auto;
	}

	#fonts, #buttons {
		margin-bottom: 20px;
	}

	.font {
		margin-top: 15px;
		margin-bottom: 20px;
	}

	.invalid {
		border-color: #ff0000 !important;
	}

	.font-icon {
		color: #1dbfff;
	}

	.output {
		width: 100%;
		max-width: 100%;
		height: 400px;
	}
</style>
