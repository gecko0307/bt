# Image Optimizer
All-in-one image manipulation and conversion tool.
* Greatly reduces size of PNG and JPEG files without much quality loss
* Fast lossless compression of PNG using [ECT](https://github.com/fhanau/Efficient-Compression-Tool)
* Optimizes SVG
* Generates WebP
* Converts between formats
* Generates inline base64-encoded CSS background-images.

Available at `http://localhost:8000/images` or `http://localhost:8000/tuner`.

Put your files to `Images` directory of the project.

Generator's frontend is written in [Svelte](https://svelte.dev/). To make edits to the frontend, run the following in this directory:

`npm run frontend:images`
