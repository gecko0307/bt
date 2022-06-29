<script>

function tabClick(event) {
		const tabName = this.getAttribute("data-name");
		console.log(tabName);
		// TODO: switch UI for tabName
	}
</script>

<main>
    <div class="tabs">
        <div class="tab active" data-name="tools" title="Tools" on:click={tabClick}>🛠️</div>
        <div class="tab" data-name="capturer" title="Capturer" on:click={tabClick}>📷</div>
        <div class="tab" data-name="builder" title="Builder" on:click={tabClick}>📦</div>
        <div class="tab" data-name="events" title="Events & messages" on:click={tabClick}>📡</div>
    </div>
    <!-- TODO: tab components -->
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
	}

	.tabs .tab.active {
		background-color: #ffffff;
		border-top: 2px solid #379683;
	}

	.tabs .tab:hover {
		background-color: #ffffff;
	}
</style>