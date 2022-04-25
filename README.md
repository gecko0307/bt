# 🧰 Banner Toolchain
HTML banner development tools for Node.js. Automate bundling, optimization and packaging of animated ads, games and other single page web projects. Inspired by and compatible with [SmartHead](https://github.com/smarthead)'s Banny Tools. Based on [Rollup](https://rollupjs.org/) and [Fastify](https://www.fastify.io/).

Warning: Banner Toolchain is currently undergoing a major refactoring, so not all existing functionality is ready for use.

* ✔️ Project initialization, custom templates
* ✔️ JavaScript module bundling and babeling
* ✔️ Dev server with file watching and autorefresh
* ✔️ [Sass](https://sass-lang.com/) support
* ✔️ [GreenSock](https://greensock.com/) animation
* ✔️ Built-in simple 3D engine based on WebGL
* ✔️ CSS animation generator that uses simple GreenSock-like input expressions
* ✔️ Web font generator with subsetting
* ✔️ Capture individual frames of animation of GreenSock banners. Output PNG, layered PSD and animated GIF
* ️✔ Capture high-quality videos of GreenSock banners at 60 fps
* ✔ Image optimizer and converter
* ✔ Generate inline base64-encoded CSS background-images
* ⌛ Banner builder
* ⌛ Banner preview tools: resizer, timer, event manager, device orientation emulator etc.

## Installation
```
npm install
npm link
```

## Basic usage
To create a new banner in an empty directory:

`bt init`

To run the development server:

`bt run`

To build banner for publishing (WIP, relies on proprietary external tool at the moment):

`bt build <platform>`

where `<platform>` is one of the supported ad platforms (see [platforms.js](https://github.com/gecko0307/bt/blob/master/src/builder/platforms.js) for details).

To capture screenshots of predefined animation frames (for GreenSock template only; dev server should be running):

`bt capture <resolution>`

To capture video (for GreenSock template only; dev server should be running):

`bt capture video <resolution>`

## Templates
`bt init` will create a project using a default template that uses [GreenSock](https://greensock.com/) animation library. Additionally [Anime.js](https://animejs.com/)-based template is available for fully self-hosted banners with as small size overhead as possible:

`bt init anime`

You can also add your own templates to `templates` directory and use them.

## Server tools (WIP)
Development server runs at `http://localhost:8000/` and serves project's `HTML` directory. Additional services are available at the following routes:
* `http://localhost:8000/preview` - developer's preview page (WIP)
* `http://localhost:8000/fonts` - web font generator
* `http://localhost:8000/images` or `http://localhost:8000/tuner` - image optimizer
* `http://localhost:8000/mobile` - mobile device emulator to work with Device Orientation API on desktop. This functionality will be reimplemented as a part of `/preview` page in future
* `http://localhost:8000/api` - toolchain API (see [src/api.js](https://github.com/gecko0307/bt/blob/master/src/api.js) for details)
* `http://localhost:8000/sse` - server-side events (SSE) interface. Currently provides only file watcher event system which can be used like this: `http://localhost:8000/sse?events=watcher`. These events are emitted when `Fonts` or `Images` directories change
* `http://localhost:8000/file?path=your/path` - retrieves any file relative to project root (a directory where dev server runs)
* `http://localhost:8000/build` - serves `build` directory with latest deploy-ready banner build.

## Copyright and license
* Banner Toolchain. Copyright (c) 2020-2022 Timur Gafarov. Distributed under the MIT license.
* cwebp. Copyright (c) 2011 Google Inc. Distributed under the BSD 3-Clause License.
* Efficient Compression Tool (ECT). Copyright (c) Felix Hanau. Distributed under the Apache License.
* Highlight.js. Copyright (c) 2006 Ivan Sagalaev. Distributed under the BSD 3-Clause License.
* Puppeteer Recorder. Copyright (c) 2017 Clipisode. Distributed under the MIT license.
* [lightgl.js](https://github.com/evanw/lightgl.js). Copyright (C) 2011 by Evan Wallace. Distributed under the MIT license.
