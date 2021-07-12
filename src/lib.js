#!/usr/bin/env node
import fs from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from 'url';
import { http } from "./plugins.js"
import { JSDOM } from "jsdom"
import esbuild from "esbuild"

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function getScript(moduleUrl, importMap, minify = false) {
  const build = await esbuild.build({
    // sourcemap: true,
    write: false,
    entryPoints: [join(__dirname, "./web.js")],
    bundle: true,
    plugins: [http(importMap)],
    define: {
      "process.env.NODE_ENV": JSON.stringify(
        minify ? "production" : "development"
      ),
      "process.env.MODULE_URL": JSON.stringify(moduleUrl),
    },
    minify,
    treeShaking: minify ? true : undefined,
  });

  return build.outputFiles[0].text;
}

export async function getStatic(script) {
  // const virtualConsole = new VirtualConsole();
  // virtualConsole.sendTo(console, { omitJSDOMErrors: true });
  const jsdom = new JSDOM("", { pretendToBeVisual: true });
  const { window } = jsdom;
  const { document } = window;

  Object.assign(global, {
    window: window,
    document: document,
    navigator: window.navigator,
  });

  if (!window.SVGElement.prototype.getTotalLength) {
    window.SVGElement.prototype.getTotalLength = () => 1;
  }

  if (!window.SVGSVGElement.prototype.viewBox) {
    window.SVGSVGElement.prototype.viewBox = {}
  }


  for (const key of ["Image", "HTMLElement", "SVGElement", "DOMParser", "SVGSVGElement"]) {
    global[key] = window[key];
  }

  // window.SVGElement = {}

  await import(script);

  const { App, React, ReactDOM } = window;

  console.log("react", React)

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

export function getHTML(template, [html, styles]) {
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

