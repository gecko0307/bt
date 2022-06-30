<script>
	import { onMount } from "svelte";

	onMount(async () => {
		timerStart();
	});

	function openURL(url) {
		window.location.href = url;
	}
</script>
<script context="module">
	let sec;
	let msec;
	let timerId = null;
	let period = 10; // milliseconds
	let startTime = Date.now();

	export function timerStart() {
		if (timerId != null) clearInterval(timerId);
		startTime = Date.now();
		timerId = setInterval(function tick() {
			var elapsedTime = Date.now() - startTime;
			var time = (elapsedTime / 1000).toFixed(3);
			if (time >= 30) {
				time = 30;
			}
			
			if (sec && msec) {
				var integer = Math.floor(time);
				sec.innerHTML = pad(integer, 2);
				var decimal = Math.floor((time % 1).toFixed(2) * 100);
				if (decimal > 99) decimal = 99;
				msec.innerHTML = pad(decimal, 2);
			}
		}, period);
	}

	function pad(n, size) {
		var s = String(n);
		while (s.length < (size || 2)) { s = "0" + s; }
		return s;
	}
</script>

<main>
	<div class="section">
		<fieldset>
			<legend>Timer</legend>
			<div id="timer"><span bind:this={sec} id="sec">00</span>:<span bind:this={msec} id="msec">00</span></div>
		</fieldset>
	</div>
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

	#timer {
		font-family: monospace;
		font-size: 50px;
		position: relative;
		margin-top: 0;
		margin-bottom: 10px;
		color: #379683;
	}
	
	#msec {
		font-size: 0.75em;
	}
</style>