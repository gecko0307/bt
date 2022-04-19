# 🧰 Banner Toolchain
HTML banner development tools for Node.js. Automate bundling, optimization and packaging of ads, games and other single page web projects. Inspired by and compatible with [SmartHead](https://github.com/smarthead)'s Banny Tools. Based on [Rollup](https://rollupjs.org/) and [Fastify](https://www.fastify.io/).

Warning: Banner Toolchain is currently undergoing a major refactoring, so not all existing functionality is ready for use.

* ✔️ Project initialization, custom templates
* ✔️ JavaScript module bundling and babeling
* ✔️ Dev server with file watching and autorefresh
* ✔️ [Sass](https://sass-lang.com/) support
* ✔️ CSS animation generator that uses simple [GreenSock](https://greensock.com/)-like input expressions
* ✔️ Web font generator with subsetting
* ✔️ Capture individual frames of animation of GreenSock banners. Output PNG, layered PSD and animated GIF
* ️✔ Capture video of GreenSock banners at 60 fps
* ⌛ Image minimizer
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

To build banner for publishing (WIP):

`bt build`

To capture screenshots of predefined animation frames (for GreenSock template only; dev server should be running):

`bt capture`

To capture video (for GreenSock template only; dev server should be running):

`bt capture video`

## Templates
`bt init` will create a project using a default template that uses [GreenSock](https://greensock.com/) animation library. Additionally [Anime.js](https://animejs.com/)-based template is available for fully self-hosted banners with as small size overhead as possible:

`bt init anime`

You can also add your own templates to `templates` directory and use them.

## Server tools (WIP)
Development server runs at `http://localhost:8000/`.

Additional utility server runs at `http://localhost:9000/`, providing helper tools and toolchain API, but it is not meant to be accessed directly. Instead, proxy routes from port 8000 should be used to access the tools:
* `http://localhost:8000/preview` - preview page (WIP)
* `http://localhost:8000/fonts` - web font generator
* `http://localhost:8000/images` or `http://localhost:8000/tuner` - image minimizer (WIP)
* `http://localhost:8000/mobile` - mobile device emulator to work with Device Orientation API on desktop. This functionality will be reimplemented as a part of `/preview` page in future.

## Copyright and license
Copyright (c) 2020-2022 Timur Gafarov. Distributed under the MIT license.
