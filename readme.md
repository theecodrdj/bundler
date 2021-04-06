# Framer Bundler

Example: 📋 [module](https://framer.com/m/framer/Site2) → 🌍 [site](https://my-framer-site-koenbok.vercel.app/)

This is a static site generator for Framer components (which are es modules). It takes a single module as input and builds a static html site. It could work pretty nice with Netlify or Vercel. It uses `esbuild` for bundling and Playwright to generate the static html. Some other features:

- Single `index.html` and `web.js` files
- Static html as initial payload (SSR)
- React hydrated for interaction (after 1 second)
- Customizable `index.html`

## Quickstart

Create a new directory for your site:

```
$ mkdir ~/MyFramerSite
$ cd ~/MyFramerSite
```

Make sure you have the "Component Sharing" experiment enabled. Create a Smart Component, right click it in the components panel and select "Copy link".

```
$ npx framer/bundler https://framer.com/m/Gallery-sVvV
```

Open the `build` folder and drop the `index.html` file on your browser, or upload it somewhere.

### Advanced options

You can edit the `index.html` file to customize your site output and the bundler will respect your changes on next runs. Just make sure to always keep a `<div id="main"></div>" in there.

You can build an optimized version (minified, tree shaked and production React) of your site using `--prod`.

```
$ npx framer/bundler https://framer.com/m/Gallery-sVvV --prod
```

If you want to quickly deploy to Vercel you need an account and you can simply run:

```
$ npx vercel
```

### Known issues

I keep these in a [Paper Document](https://paper.dropbox.com/doc/Static-Framer-Site-Findings-OBXBx4Jt19J29SfrQlgRC).
