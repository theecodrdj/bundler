#!/usr/bin/env node
const fs = require("fs");
const { join } = require("path");
const { http } = require("./plugins");
const { JSDOM } = require("jsdom");
const esbuild = require("esbuild");

const scriptName = "web";
const indexHtmlTemplate = `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body {
        margin: 0;
      }
    </style>
  </head>
  <body>
    <div id="main"></div>
    <script src="./${scriptName}.js"></script>
    <script>
      document.addEventListener("DOMContentLoaded", () => {
        ReactDOM.hydrate(
          React.createElement(window.App),
          document.getElementById("main")
        );
      });
    </script>
  </body>
</html>
`;

const projectPath = process.cwd();
const buildPath = join(projectPath, "build");
const indexHtmlTemplatePath = join(projectPath, "index.html");
const indexHtmlBuildPath = join(buildPath, "index.html");

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

function rm(path) {
  if (fs.existsSync(path)) {
    fs.rmdirSync(path, { recursive: true });
  }
}

function write(path, contents, overwrite = false) {
  if (fs.existsSync(path)) {
    if (!overwrite) return false;
    if (fs.file) rm(path);
  }
  fs.writeFileSync(path, contents);
}

async function build(moduleUrl, minify = false) {
  // Clean out the old build folder if it's there
  rm(buildPath);
  fs.mkdirSync(buildPath);

  write(indexHtmlTemplatePath, indexHtmlTemplate);

  // Build the main js using esbuild and bundle in a single script
  const scriptBuildPath = join(buildPath, `${scriptName}.js`);
  const script = await getScript(moduleUrl, minify);

  write(scriptBuildPath, script);

  const template = fs.readFileSync(indexHtmlTemplatePath).toString();
  const html = getHTML(template, getStatic(`./build/${scriptName}`));
  write(indexHtmlBuildPath, html);

  console.log(`^^^ Ignore any react or svg errors here for now`);
  console.log(`✅ Done: ./build`);

  // We need a manual exit to make sure jsdom stops if it has timers running
  process.exit();
}

const moduleUrl = process.argv[2];
const minify = (process.argv[3] || "").toLowerCase().trim() === "--prod";

if (!moduleUrl || !moduleUrl.startsWith("http")) {
  console.log(
    `⚠️ Expected module url argument, something like: \n$ npx framer/bundler https://framer.com/m/framer/Site2.js`
  );
  process.exit();
}

(async () => build(moduleUrl, minify))();
