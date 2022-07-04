<script>
	import { onMount, createEventDispatcher } from "svelte";

	const dispatch = createEventDispatcher();

	let brand = "";
	let campaign = "";
	let creative = "";
	let size = "";
	let platform = "publish";
	let version = "v1";

	async function apiRequest(data) {
		const res = await fetch("/api", {
			method: "POST",
			body: JSON.stringify(data)
		});
		return await res.json();
	}

	onMount(async () => {
		const config = await apiRequest({
			method: "buildConfig"
		});
		console.log(config);
		brand = config.brand || "";
		campaign = config.campaign || "";
		creative = config.creative || "";
		platform = config.platform || "publish";
		version = config.version || "v1";
		size = config.size || "";
	});

	async function build() {
		dispatch("start", { 
			message: "Build..."
		});

		const res = await apiRequest({
			method: "build"
			// TODO: build options
		});

		console.log(res);

		dispatch("ready", {
			...res,
			build: {
				haveResult: res.ok,
				filename: res.archiveFilename || ""
			}
		});
	}
</script>

<main>
	<div class="section">
		<fieldset>
			<legend>Build</legend>
			<p>Brand</p>
			<p><input type="text" size="45" style="width:200px" bind:value={brand}></p>
			<p>Campaign</p>
			<p><input type="text" size="45" style="width:200px" bind:value={campaign}></p>
			<p>Creative</p>
			<p><input type="text" size="45" style="width:200px" bind:value={creative}></p>
			<p>Size</p>
			<p><input type="text" size="45" style="width:200px" bind:value={size}></p>
			<p>Platform</p>
			<p><input type="text" size="45" style="width:200px" bind:value={platform}></p>
			<p>Version</p>
			<p><input type="text" size="45" style="width:200px" bind:value={version}></p>
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

	input[type=text] {
		margin-top: 5px;
		margin-bottom: 10px;
	}
</style>