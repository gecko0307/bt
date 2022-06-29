<script>
	import { onMount } from "svelte";
	import { fade } from "svelte/transition";
	import "style/core.css";
	
	let sse;

	const screens = {
		iphone_se: { width: 375, height: 667 },
		iphone_xr: { width: 414, height: 896 },
		iphone_12_pro: { width: 390, height: 844 }
	};

	let bannerContainer;
	let banner;
	let bannerURL = "/index.html";
	let bannerInternalContainer;
	let bannerDefaultWidth = 240;
	let bannerDefaultHeight = 400;
	let bannerWidth = bannerDefaultWidth;
	let bannerHeight = bannerDefaultHeight;
	let bannerWidthProp = bannerWidth;
	let bannerHeightProp = bannerHeight;
	let bannerDevice = "default";
	
	let observer;

	async function apiRequest(data) {
		const res = await fetch("/api", {
			method: "POST",
			body: JSON.stringify(data)
		});
		return await res.json();
	}
	
	onMount(async () => {
		sse = new EventSource("/sse?events=watcher");
		sse.onmessage = async function(event) {
			const data = JSON.parse(event.data);
		};
		sse.onerror = function(error) {
			console.error("EventSource failed: ", error);
		};

		banner.onload = bannerOnLoad;

		observer = new ResizeObserver(mutations => {
			bannerWidth = mutations[0].contentRect.width;
			bannerHeight = mutations[0].contentRect.height;
			bannerWidthProp = bannerWidth;
			bannerHeightProp = bannerHeight;
		});
		observer.observe(bannerContainer);
	});

	function bannerOnLoad(event) {
		console.log("Banner loaded");
		const bannerWindow = banner.contentWindow;
		const bannerDocument = bannerWindow.document;
		bannerInternalContainer = bannerDocument.getElementById("container");
		if (bannerInternalContainer) {
			bannerDefaultWidth = bannerInternalContainer.offsetWidth;
			bannerDefaultHeight = bannerInternalContainer.offsetHeight;
		}
	}

	function bannerSizeChange(event) {
		observer.disconnect();
		bannerContainer.style.width = bannerWidthProp + "px";
		bannerContainer.style.height = bannerHeightProp + "px";
		observer.observe(bannerContainer);
	}

	function bannerSrcKeyPress(event) {
		if (event.charCode === 13) {
			loadBanner();
		}
	}
	
	function loadBanner() {
		banner.src = "";
		banner.src = bannerURL;
	}

	function bannerDeviceChange() {
		let screen = screens[bannerDevice];
		bannerWidthProp = screen.width;
		bannerHeightProp = screen.height;
		bannerContainer.style.width = bannerWidthProp + "px";
		bannerContainer.style.height = bannerHeightProp + "px";
	}

	function bannerResetSize() {
		bannerWidthProp = bannerDefaultWidth;
		bannerHeightProp = bannerDefaultHeight;
		bannerContainer.style.width = bannerWidthProp + "px";
		bannerContainer.style.height = bannerHeightProp + "px";
	}

	function tabClick(event) {
		const tabName = this.getAttribute("name");
		console.log(tabName);
		// TODO: switch UI for tabName
	}
</script>

<main>
	<div id="ui">
		<div id="preview">
			<div id="resize_area">
				<div id="banner_container" bind:this={bannerContainer}>
					<iframe title="banner" id="banner" bind:this={banner} src="/index.html" frameborder="0" scrolling="no"></iframe>
				</div>
			</div>
			<div id="size_info">
				<div class="row">
					<div class="widget">
						<p>Banner URL</p>
						<input type="text" size="45" style="width:200px" bind:value={bannerURL} on:keypress={ bannerSrcKeyPress }>
						<input type="button" value="↻" on:click={loadBanner}/>
					</div>
					<div class="widget">
						<p>Width</p>
						<input type="number" size="45" bind:value={bannerWidthProp} min=0 on:input={bannerSizeChange}>
					</div>
					<div class="widget">
						<p>Height</p>
						<input type="number" size="45" bind:value={bannerHeightProp} min=0 on:input={bannerSizeChange}>
					</div>
					<div class="widget">
						<p>Device</p>
						<select bind:value={bannerDevice} on:change={bannerDeviceChange}>
							<option value="iphone_se">iPhone SE</option>
							<option value="iphone_xr">iPhone XR</option>
							<option value="iphone_12_pro">iPhone 12 Pro</option>
						</select>
						<input type="button" value="Reset" on:click={bannerResetSize}/>
					</div>
				</div>
			</div>
		</div>
		<div id="control">
			<div class="tabs">
				<div class="tab active" name="tools" title="Tools" on:click={tabClick}>🛠️</div>
				<div class="tab" name="capturer" title="Capturer" on:click={tabClick}>📷</div>
				<div class="tab" name="builder" title="Builder" on:click={tabClick}>📦</div>
				<div class="tab" name="events" title="Events & messages" on:click={tabClick}>📡</div>
			</div>
			<!-- TODO: tab components -->
		</div>
	</div>
</main>

<style>
	* {
		box-sizing: border-box;
	}

	main {
		padding: 0;
		margin: 0;
		width: 100%;
		height: 100%;
	}

	#ui {
		position: absolute;
		padding: 0;
		margin: 0;
		width: 100%;
		height: 100%;
	}

	#preview {
		position: absolute;
		padding: 0;
		margin: 0;
		width: auto;
		left: 0;
		right: 300px;
		height: 100%;
		overflow: auto;
		background-color: #cccccc;
	}

	#size_info {
		position: absolute;
		margin: 0;
		width: 100%;
		height: 74px;
		background-color: #ffffff;
		padding: 10px;
	}

	#resize_area {
		position: absolute;
		padding: 0;
		margin: 0;
		width: 100%;
		height: auto;
		top: 74px;
		bottom: 0;
		overflow: auto;
	}

	#banner_container {
		position: absolute;
		padding: 0;
		margin: 0;
		width: 240px;
		height: 400px;
		left: -100%;
		right: -100%;
		margin-left: auto;
		margin-right: auto;
		top: -100%;
		bottom: -100%;
		margin-top: auto;
		margin-bottom: auto;
		/* top: 42px; */
		background-color: #ffffff;
		touch-action: none;
		resize: both;
		overflow: hidden;
		box-shadow: 0 0 10px rgba(0,0,0,0.5);
	}

	#banner {
		position: absolute;
		width: 100%;
		height: 100%;
		overflow: hidden;
		left: 0; right: 0;
		top: 0; bottom: 0;
		margin: auto;
		opacity: 1;
	}

	input[type=button] {
		width: auto;
		min-width: 30px;
		height: 30px;
		padding: 5px 5px;
		margin-right: 5px;
		background-color: #ffffff;
		border: 1px solid #379683;
		border-radius: 4px;
		font-family: sans-serif;
		font-size: 15px;
		float: none;
	}

	input[type=number] {
		margin: 5px 0px;
	}

	select {
		margin: 5px 0px;
	}

	#control {
		position: absolute;
		margin: 0;
		width: 300px;
		height: 100%;
		left: auto;
		right: 0;
		background-color: #ffffff;
		border-left: 1px solid #cccccc;
	}

	.tabs {
		position: absolute;
		margin: 0;
		width: 100%;
		height: 48px;
		background-color: #eeeeee;
	}

	.tabs .tab {
		display: block;
		float: left;
		margin: 0;
		width: 48px;
		height: 48px;
		border: none;
		outline: none;
		cursor: pointer;
		background-color: #eeeeee;
		font-size: 25px;
		text-align: center;
		padding-top: 5px;
	}

	.tabs .tab.active {
		background-color: #ffffff;
		border-top: 2px solid #379683;
	}

	.tabs .tab:hover {
		background-color: #ffffff;
	}
</style>
