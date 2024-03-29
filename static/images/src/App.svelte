<script>
    import { onMount, onDestroy } from "svelte";
    import { fade } from "svelte/transition";
    import "style/core.css";
    import ImageSettings from "./ImageSettings.svelte";

    let sse;
    
    let images = [];
    let config = { images: {} };

    $: disabled = (images.length === 0);

    let optimizing = false;
    let error = false;
    let errorMessage = "";

    $: totalSize = Object.values(config.images).reduce((total, value) => total + value.compressed.weight, 0);
    $: totalSizeUncompressed = Object.values(config.images).reduce((total, value) => total + value.compressed.unzipped, 0);
    
    async function apiRequest(data) {
        const res = await fetch("/api", {
            method: "POST",
            body: JSON.stringify(data)
        });
        return await res.json();
    }

    async function updateImages() {
        const res = await apiRequest({
            method: "imagesList"
        });
        images = res.data.images;
        console.log(images);
    }

    async function updateConfig() {
        const res = await apiRequest({
            method: "imagesConfig"
        });
        config = res.data.config;
        console.log(config);
    }
    
    async function optimize() {
        optimizing = true;
        const res = await apiRequest({
            method: "optimizeImages",
            config: config
        });
        if (!res.ok) {
            error = true;
            errorMessage = res.message;
        }
        await updateConfig();
        optimizing = false;
    }

    async function closeOverlay() {
        error = false;
        errorMessage = "";
        optimizing = false;
    }
    
    onMount(async () => {
        await updateImages();
        await updateConfig();

        sse = new EventSource("/sse?events=watcher");
        sse.onmessage = async function(event) {
            const data = JSON.parse(event.data);
            if (data.subsystem === "images") {
                await updateImages();
            }
        };
        sse.onerror = function(error) {
            console.error("EventSource failed: ", error);
        };
    });

    onDestroy(() => {
		sse.close();
	});
</script>

<main>
    <div id="ui">
        <h1>Image Optimizer</h1>
        <div id="images">
            {#if images.length > 0}
                {#each images as imageFile}
                    {#if imageFile in config.images}
                        <div class="image">
                            <fieldset>
                                <legend>
                                    <b>{imageFile}</b> - 
                                    {(config.images[imageFile].compressed.unzipped / 1024).toFixed(2)} Kb / 
                                    {(config.images[imageFile].compressed.weight / 1024).toFixed(2)} Kb zip
                                </legend>
                                <ImageSettings filename={imageFile} data={config.images[imageFile]} />
                            </fieldset>
                        </div>
                    {/if}
                {/each}
            {:else}
                <p>No images found in "Images" directory</p>
            {/if}
        </div>
        <div id="buttons">
            <input {disabled} type="button" value="⚙️ Optimize" on:click={ optimize }/>
        </div>
        <div id="info">
            <p>Total size: <b>{(totalSizeUncompressed / 1024).toFixed(2)} Kb / {(totalSize / 1024).toFixed(2)} Kb zip</b></p>
        </div>
    </div>
    {#if optimizing || error}
        <div id="overlay" transition:fade="{{ duration: 100 }}">
            <div id="overlay-bg"></div>
            {#if optimizing}
                <img id="preloader" src="images/preloader.svg" alt="preloader" transition:fade={{ duration: 100 }}>
            {/if}
            {#if error}
                <div id="error" transition:fade={{ duration: 100 }}>
                    😞 Error!<br><br>
                    { errorMessage }
                </div>
                <div id="close" on:click={ closeOverlay } transition:fade={{ duration: 100 }}>
                    <img id="close-bg" src="images/close.svg" alt="close">
                </div>
            {/if}
        </div>
    {/if}
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
        padding: 10px;
        margin: 0;
        width: 95%;
        max-width: 1440px;
        left: -100%;
        right: -100%;
        margin-left: auto;
        margin-right: auto;
    }

    #images {
        margin-bottom: 20px;
    }

    .image {
        margin-top: 15px;
        margin-bottom: 10px;
    }

    #overlay {
        position: absolute;
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
    }

    #overlay-bg {
        position: fixed;
        width: 100%;
        height: 100%;
        background-color: #000000;
        opacity: 0.6;
    }

    #preloader {
        position: fixed;
        width: 10vh;
        height: auto;
        left: -100%;
        right: -100%;
        margin-left: auto;
        margin-right: auto;
        top: -100%;
        bottom: -100%;
        margin-top: auto;
        margin-bottom: auto;
    }

    #error {
        position: fixed;
        width: 80%;
        max-width: 400px;
        left: -100%;
        right: -100%;
        margin-left: auto;
        margin-right: auto;
        top: 50%;
        transform: translateY(-50%);
        font-family: sans-serif;
        font-size: 18px;
        text-align: center;
        color: #ffffff;
    }

    #close {
        position: fixed;
        width: 32px;
        height: 32px;
        left: auto;
        right: 20px;
        top: 20px;
        cursor: pointer;
        /* border: 1px solid white; */
    }
    #close-bg {
        width: 100%;
        height: 100%;
    }

    #info {
        pointer-events: none;
    }
    #info p {
        position: relative;
        padding-top: 10px;
        left: 10px;
        font-family: sans-serif;
        font-size: 14px;
        color: #000000;
    }
</style>
