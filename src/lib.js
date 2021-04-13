#!/usr/bin/env node
const fs = require("fs");
const { join } = require("path");
const { http } = require("./plugins");
const { JSDOM } = require("jsdom");
const esbuild = require("esbuild");

async function getScript(moduleUrl, minify = false) {
  const build = await esbuild.build({
    write: false,
    entryPoints: [join(__dirname, "web.js")],
    bundle: true,
    plugins: [http],
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

function getStatic(script) {
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

  require(script);

  const { App, React, ReactDOM } = window;
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

function getHTML(template, [html, styles]) {
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

Object.assign(exports, { getHTML, getScript, getStatic });
