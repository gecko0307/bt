<script>
	import { createEventDispatcher } from "svelte";

	const dispatch = createEventDispatcher();
</script>

<main>
	<div class="section">
		<fieldset>
			<legend>Messages</legend>
			<!-- TODO -->
		</fieldset>
	</div>
	<div class="section">
		<fieldset>
			<legend>Callbacks</legend>
			<!-- TODO -->
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
</style>