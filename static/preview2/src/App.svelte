<script>
	import { onMount } from "svelte";
	import { fade } from "svelte/transition";
	import "style/core.css";
	
	let sse;

	
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
	});
</script>

<main>
	<div id="ui">
		<!-- TODO: sizing panel -->
		<div id="resizable_area">
			<div id="banner_container">
				<iframe title="banner" id="banner" src="/index.html" frameborder="0" scrolling="no"></iframe>
			</div>
		</div>
		<div id="control">
		</div>
	</div>
</main>

<style>
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

	#resizable_area {
		position: absolute;
		width: 240px;
		height: 400px;
		left: -100%;
		right: -100%;
		margin-left: auto;
		margin-right: auto;
		background-color: #ffffff;
		box-sizing: border-box;
		touch-action: none;
		resize: both;
		overflow: auto;
		border: 1px solid #000000;
		box-shadow: 0 0 10px rgba(0,0,0,0.5);
	}

	#banner_container {
		position: absolute;
		box-sizing: border-box;
		width: 100%;
		height: 100%;
		background-color: #cccccc;
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
</style>
