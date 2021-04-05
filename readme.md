## Framer Bundler

Example: [module](https://framer.com/m/framer/Site2) → [site](https://my-framer-site-koenbok.vercel.app/)

This is a static site generator for Framer components (which are es modules). It takes a single module as input and builds a static html site. It could work pretty nice with Netlify or Vercel. It uses `esbuild` for bundling and Playwright to generate the static html. Some other features:

- Single index.html and web.js files
- Static html as initial payload (SSR)
- React hydrated for interaction (after 1 second)
- Customizable `index.html`

## Quickstart

Create a new directory for your site:

```
$ mkdir ~/MyFramerSite
$ cd ~/MyFramerSite
```

Create a Smart Component in Framer, click the share button and grab the actual `.js` url. You can find it under "Copy Import Statement". It looks something like `https://framer.com/m/framer/Site2.js`. Now run the Framer bundler from within your directory:

```
$ npx github:framer/bundler https://framer.com/m/framer/Site2.js
```

Open the `build` folder and drop the `index.html` file on your browser, or upload it somewhere.

### Known issues

We definitely can fix most of these.

- The `web.js` can get big, up to 2mb (360kb gzipped)
- There is often a difference between the static and hydrated content
- Fonts don't work, and maybe other assets don't work either
- Images only load _after_ hydration
