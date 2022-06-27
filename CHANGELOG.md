BT 1.0.0. alpha3 - 27 Jun, 2022
-------------------------------
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