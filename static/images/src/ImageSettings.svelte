<script>
    import { onMount } from "svelte";
	import "style/core.css";
	export let filename = "";
	export let data = {};

	$: imagePath = "Images/" + filename;

    //$: outputFormat = data.options.outputFormat;
	$: inputFormat = filename.substring(filename.lastIndexOf(".") + 1);
    $: canConvertToPNG = inputFormat === "png" || inputFormat === "svg";
    $: canConvertToJPEG = inputFormat === "png" || inputFormat === "jpg" || inputFormat === "svg";
    $: canConvertToWebP = inputFormat === "png" || inputFormat === "jpg" || inputFormat === "svg" || inputFormat === "webp";
    $: canConvertToSVG = inputFormat === "png" || inputFormat === "svg";

	$: pngOnly = (data.options.outputFormat === "png");
	$: jpgOnly = (data.options.outputFormat === "jpg");
	$: svgOnly = (data.options.outputFormat === "svg");
	$: webpOnly = (data.options.outputFormat === "webp");

    $: qualityText = _qualityText(data.options.outputFormat);

    function _qualityText(fmt) {
        if (fmt === "webp") return "Quality";
        else if (fmt === "jpg") return "Quality";
        else if (fmt === "png") return "Quality";
        else if (fmt === "svg") {
            if (inputFormat === "png") return "Quality";
            else return "Precision";
        }
    }

	onMount(async () => {
	});
</script>

<main>
    <div class="row">
        <div class="thumb">
            <a href="/file?path={imagePath}" target="_blank">
                <img class="thumb_image" src="/file?path={imagePath}" alt="{filename}">
            </a>
        </div>

        <div class="widget anyFormat">
            <p>Format</p>
            <select bind:value={data.options.outputFormat}>
                {#if canConvertToPNG}
                    <option value="png">PNG</option>
                {/if}
                {#if canConvertToJPEG}
                    <option value="jpg">JPEG</option>
                {/if}
                {#if canConvertToWebP}
                    <option value="webp">WebP</option>
                {/if}
                {#if canConvertToSVG}
                    <option value="svg">SVG</option>
                {/if}
            </select>
        </div>

        {#if !data.options.compress.lossless && !(inputFormat === "svg" && data.options.outputFormat === "svg")}
            <div class="widget anyFormat">
                <p>{qualityText}</p>
                <input type="range" min="1" max="100" step="1" bind:value={data.quality}>
            </div>
            <div class="widget anyFormat" style="padding-top: 14px">
                <input type="number" min="1" max="100" step="1" bind:value={data.quality}>
            </div>
        {/if}

        <div class="widget" class:jpgOnly style="padding-top: 14px">
            <label>
                <input type="checkbox" bind:checked={data.options.compress.progressive} />Progressive
            </label>
        </div>
        <div class="widget" class:jpgOnly style="padding-top: 14px">
            <label>
                <input type="checkbox" bind:checked={data.options.compress.grayscale} />
                Grayscale
            </label>
        </div>

        <div class="widget" class:svgOnly style="padding-top: 14px">
            <label>
                <input type="checkbox" bind:checked={data.options.compress.pretty} />
                Pretty
            </label>
        </div>

        <div class="widget" class:pngOnly class:webpOnly style="padding-top: 14px">
            <label>
                <input type="checkbox" bind:checked={data.options.compress.lossless} />
                Lossless
            </label>
        </div>

        {#if !data.options.compress.lossless}
            <div class="widget" class:pngOnly>
                <p>Dithering</p>
                <select bind:value={data.options.compress.imageDithering}>
                    <option value="nearest">Nearest</option>
					<option value="riemersma">Riemersma</option>
					<option value="floyd-steinberg">Floyd-Steinberg</option>
					<option value="false-floyd-steinberg">False Floyd-Steinberg</option>
					<option value="stucki">Stucki</option>
					<option value="atkinson" selected>Atkinson</option>
					<option value="burkes">Burkes</option>
					<option value="sierra">Sierra</option>
					<option value="two-sierra">Two-Sierra</option>
					<option value="sierra-lite">Sierra Lite</option>
					<option value="jarvis">Jarvis</option>
                </select>
            </div>
            <div class="widget" class:pngOnly>
                <p>Palette quantization</p>
                <select bind:value={data.options.compress.paletteDithering}>
					<option value="neuquant">NeuQuant</option>
					<option value="neuquant-float">NeuQuant (float)</option>
					<option value="rgbquant">RGBQuant</option>
					<option value="wuquant" selected>WuQuant</option>
				</select>
            </div>
        {/if}

        {#if inputFormat === "svg" && data.options.outputFormat !== "svg" }
            <div class="widget anyFormat">
                <p>Width</p>
                <input type="number" min="1" step="1" bind:value={data.options.outputWidth}>
            </div>
            <div class="widget anyFormat">
                <p>Height</p>
                <input type="number" min="1" step="1" bind:value={data.options.outputHeight}>
            </div>
        {/if}

        <div class="widget anyFormat" style="padding-top: 14px">
            <label>
                <input type="checkbox" bind:checked={data.options.compress.inline} />
                Inline
            </label>
        </div>

        {#if data.options.compress.inline}
            <div class="widget anyFormat">
                <p>CSS selector</p>
                <input type="text" bind:value={data.options.compress.selector} />
            </div>
        {/if}
    </div>
</main>

<style>
    main {
		padding: 0;
		margin: 0;
	}

    .widget {
        display: none;
    }

	.pngOnly, .jpgOnly, .svgOnly, .webpOnly, .anyFormat {
		display: block !important;
	}

	.thumb {
		position: relative;
		width: 50px;
		height: 50px;
		padding: 0;
		border: 1px solid #379683;
		border-radius: 4px;
		overflow: hidden;
	}
	.thumb:hover {
		background-color: #edf5e1;
		cursor: pointer;
	}

	.thumb_image {
		position: absolute;
		margin: 0;
		width: auto;
		height: 90%;
		left: -100%;
		right: -100%;
		margin-left: auto;
		margin-right: auto;
		top: -100%;
		bottom: -100%;
		margin-top: auto;
		margin-bottom: auto;
	}

    input[type=text] {
        max-width: 80px; 
    }

	input[type=range] {
		flex: auto;
		min-width: 200px;
	}

	input[type=checkbox] {
		margin-right: 5px;
	}
</style>