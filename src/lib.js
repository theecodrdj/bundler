#!/usr/bin/env node
const { join } = require("path");
const { http } = require("./plugins");
const { JSDOM } = require("jsdom");
const esbuild = require("esbuild");

async function getScript(
  moduleUrl,
  minify = false,
  framerLibraryPath = undefined
) {
  const build = await esbuild.build({
    write: false,
    entryPoints: [join(__dirname, "web.js")],
    bundle: true,
    sourcemap: minify ? undefined : "inline",
    plugins: [http],
    define: {
      "process.env.NODE_ENV": JSON.stringify(
        minify ? "production" : "development"
      ),
      "process.env.MODULE_URL": JSON.stringify(moduleUrl),
      "process.env.FRAMER_LIBRARY_PATH": JSON.stringify(framerLibraryPath),
    },
    minify,
    treeShaking: minify ? true : undefined,
  });

  return build.outputFiles[0].text;
}

function getStatic(script) {
  // const virtualConsole = new VirtualConsole();
  // virtualConsole.sendTo(console, { omitJSDOMErrors: true });
  const jsdom = new JSDOM("", { pretendToBeVisual: true });
  const { window } = jsdom;
  const { document } = window;

  class ResizeObserver {
    observe() {}
    unobserve() {}
  }

  // We have to prepare the render environment here

  Object.assign(global, {
    window: window,
    document: document,
    navigator: window.navigator,
    ResizeObserver,
  });

  window.SVGElement.prototype.getTotalLength = () => 1;
  window.HTMLVideoElement.prototype.play = () => {};
  window.HTMLVideoElement.prototype.pause = () => {};

  for (const key of ["Image", "HTMLElement"]) {
    global[key] = window[key];
  }

  require(script);

  const { App, React, ReactDOM, Framer } = window;

  // Framer.RenderTarget.current = () => Framer.RenderTarget.export;

  const html = ReactDOM.renderToString(React.createElement(App));

  // Render the app once into the document so we can pick up the styles
  ReactDOM.render(React.createElement(App), document.createElement("div"));

  //   Pick up the last inserted style after rendering
  const styles = Array.from(document.head.getElementsByTagName("style"))
    .map((style) => style.textContent)
    .join("\n");

  window.close();

  return [html, styles];
}

function getPageHTML(template, [html, styles]) {
  const regex = /(<div id=.main.>)(.*)(<\/div>)/is;
  const result = template
    // Replace the empty div in the hmtl file with the static html content
    .replace(regex, `<div id="main">${html}</div>`)
    // Insert the dynamic styles into the head tag
    .replace("</head>", `\n<style>\n${styles}\n</style>\n</head>`);

  if (!html || template === result) {
    throw Error(`Could not add static html to \n${html}`);
  }

  return result;
}

Object.assign(exports, { getPageHTML, getScript, getStatic });
