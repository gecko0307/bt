BT 1.0.0 alpha8 - 21 Apr, 2023
------------------------------
- **Development server**
  - GLSL shader bundling
- **Deployer** - new tool for building banners from Git repository branches
- **Builder**
  - New platform specifications `2gis`, `mail_unminified`
  - Support inline SVG images
  - Strip console output when using gulp-builder
  - Fix archive versioning
- **Capturer**
  - Use Gifski to create GIFs under Windows
  - Fix recording banners with width or height not divisible by 2.

BT 1.0.0 alpha7 - 26 Sep, 2022
------------------------------
- **Development server**
  - Support `.data/server.config.json`
- **Builder**
  - New platform specifications `hybe`, `gonet`, `adspector` (alias for `soloway`), `ok_interactive` (alias for `vk`)
  - Size explicitly defined in `builder.config.json` now overrides detected size
  - Meta tag is now added only if it doesn't already exist
  - Support mixing in existing value of an attribute (`{{context.content}}`) in platform specification.

BT 1.0.0 alpha6 - 13 Aug, 2022
------------------------------
- **Development server**
  - Inject livereload script to `index.html` instead of `animation.js`
- **Builder**
  - New platform specification `yandex_main_dropdown`
  - Fix `prepare.js`

BT 1.0.0 alpha5 - 21 Jul, 2022
------------------------------
- **Preview**
  - Build options
  - Build result is shown in a modal window
- **Font Generator**
  - Save to file option
- **Builder**
  - Fix `href` check for link elements

BT 1.0.0 alpha4 - 02 Jul, 2022
------------------------------
- **Builder**
  - Now Builder always adds `data-version` attribute to `body`
  - Support SVG images
  - All warnings are now printed at the end of the build
- **Preview**
  - Updated banner preview page: a timeline to control animation, better UI for banner resizing, all tools and options are now organized in tabs
  - Set capture options and capture videos from UI
  - Capture screenshots
  - Open Image Optimizer and Font Generator in the same tab in a modal window

BT 1.0.0 alpha3 - 27 Jun, 2022
------------------------------
- **Builder**
  - Support HTML5 video
  - Stripped-down build (using `strip` spec) to generate only the `body` content, without full HTML, for direct embedding to a page
  - [Autoprefixer](https://github.com/postcss/autoprefixer) to generate browser-specific CSS selectors
  - Fix building banners without `container` element

BT 1.0.0 alpha2 - 8 Jun, 2022
-----------------------------
- **Initializer**
  - Fix initializing with user template
- **Builder**
  - Support `creative` field in `builder.config.json`
  - Add `data-version` attribute to `body` with `version` field from `builder.config.json`
  - Empty CSS files are now handled correctly
- **Image Optimizer**
  - Fix removing image from `tuner.config.json`
- **Default template**
  - Add post-processing composer module to WebGL engine

BT 1.0.0 alpha1 - 1 Jun, 2022
-----------------------------
Initial unstable release.
