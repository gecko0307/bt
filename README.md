# Banner Toolchain
Banner development tools compatible with projects for SmartHead's Banny Tools. Automate optimization and packaging of HTML ad creatives.
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
