# Banner Toolchain
HTML banner development tools compatible with projects for SmartHead's Banny Tools. Automate bundling, optimization and packaging of ads, games and other single page web projects.
* ✔️ Project initialization
* ✔️ JavaScript module bundling and minification
* ✔️ Server with autorefresh
* ✔️ Sass
* ✔️ CSS animation generator
* ⌛ Web font generator
* ⌛ Image minimizer
* ⌛ Banner builder
* ⌛ Banner preview tools

## Usage
Installation:
```
npm install
npm link
```

To create a new banner in an empty directory:

`bt init`

This will create a project using a default template. You can add your own templates to `templates` directory and use them, for example:

`bt init mySuperTemplate`

To run the development server:

`bt run`

To build banner for publishing (WIP):

`bt build`

Development server runs at `http://localhost:8000/`.

Additional utility server runs at `http://localhost:9000/`, providing helper tools and toolchain API, but it is not meant to be accessed directly. Instead, proxy routes from port 8000 should be used to access the tools:
* `http://localhost:8000/preview` - preview page (WIP)
* `http://localhost:8000/fonts` - web font generator (WIP)
* `http://localhost:8000/images` or `http://localhost:8000/tuner` - image minimizer (WIP)
* `http://localhost:8000/mobile` - mobile device emulator to work with Device Orientation API on desktop. This functionality will be reimplemented as a part of `/preview` page in future.

## Copyright and license
Copyright (c) 2020-2022 Timur Gafarov. Distributed under the MIT license.
