<script>
	import { createEventDispatcher } from "svelte";

	const dispatch = createEventDispatcher();

	let currentTab = "tools";
	
	function tabClick(event) {
		const tabName = this.getAttribute("data-name");
		currentTab = tabName;
		dispatch("change", { tab: currentTab });
	}
</script>

<main>
	<div class="tabs">
		<div class="tab" class:active="{currentTab === 'tools'}" data-name="tools" title="Tools" on:click={tabClick}>🛠️</div>
		<div class="tab" class:active="{currentTab === 'capturer'}" data-name="capturer" title="Capturer" on:click={tabClick}>📷</div>
		<div class="tab" class:active="{currentTab === 'builder'}" data-name="builder" title="Builder" on:click={tabClick}>📦</div>
		<div class="tab" class:active="{currentTab === 'events'}" data-name="events" title="Events & messages" on:click={tabClick}>📡</div>
	</div>
</main>

<style>
	main {
		position: absolute;
		box-sizing: border-box;
		padding: 0;
		margin: 0;
		width: 100%;
		height: 48px;
	}

 	.tabs {
		position: absolute;
		box-sizing: border-box;
		margin: 0;
		width: 100%;
		height: 48px;
		background-color: #eeeeee;
	}

	.tabs .tab {
		box-sizing: border-box;
		float: left;
		margin: 0;
		width: 48px;
		height: 48px;
		cursor: pointer;
		background-color: #eeeeee;
		font-size: 25px;
		text-align: center;
		padding-top: 5px;
		user-select: none;
	}

	.tabs .tab.active {
		background-color: #ffffff;
		border-top: 2px solid #379683;
	}

	.tabs .tab:hover {
		background-color: #ffffff;
	}
</style>