<script>
	import { onMount } from "svelte";
	
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
	input[type=button]:disabled {
		border: 1px solid #dddddd;
		pointer-events: none;
	}
</style>