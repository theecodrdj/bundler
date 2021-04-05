#!/usr/bin/env node
const fs = require("fs");
const { join } = require("path");
const { webkit } = require("playwright");
const { http } = require("./plugins");

const TEMPLATES = {};

TEMPLATES["index.html"] = `<!doctype html>
<html>
  <head>
    <style>body {margin: 0}</style>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body>
    <script src="./web.js"></script>
    <div id="main"></div>
  </body>
</html>
`;

const projectPath = process.cwd();
const buildPath = join(projectPath, "build");
const indexHtmlTemplatePath = join(projectPath, "index.html");
const indexHtmlBuildPath = join(buildPath, "index.html");

async function buildScript(moduleUrl, outPath, minify = false) {
  return require("esbuild").build({
    entryPoints: [join(__dirname, "web.js")],
    bundle: true,
    outfile: outPath,
    plugins: [http],
    define: {
      "process.env.NODE_ENV": JSON.stringify(
        minify ? "production" : "development"
      ),
      "process.env.MODULE_URL": JSON.stringify(moduleUrl),
    },
    minify,
    treeShaking: minify,
  });
}

async function buildHtml(url) {
  const browser = await webkit.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(url);
  console.log("Page loaded...");
  // await page.screenshot({ path: join(buildPath, "site.png") });
  const html = await page.evaluate(() => {
    console.log(window.__export);
    return window.__export();
  });
  await browser.close();
  return html;
}

async function build(moduleUrl, minify = false) {
  // Clean out the old build folder if it's there
  fs.rmdirSync(buildPath, { recursive: true });

  // Build the main js using esbuild and bundle in a single script
  await buildScript(moduleUrl, join(buildPath, "web.js"), minify);

  // Make sure we at least have an index.html template that we can use (or tweak)
  if (!fs.existsSync(indexHtmlTemplatePath)) {
    fs.writeFileSync(indexHtmlTemplatePath, TEMPLATES["index.html"]);
  }

  fs.copyFileSync(indexHtmlTemplatePath, indexHtmlBuildPath);

  // Build the static html to hydrate, this uses React.renderToString
  const html = await buildHtml(`file://${indexHtmlBuildPath}`);
  const indexHtml = fs.readFileSync(indexHtmlBuildPath).toString();

  // Replace the empty div in the hmtl file with the static html content
  const regex = /(<div id=.main.>)(.*)(<\/div>)/is;
  const indexHtmlWithSSR = indexHtml.replace(
    regex,
    `<div id="main">${html}</div>`
  );

  if (!html || indexHtml === indexHtmlWithSSR) {
    throw Error(`Could not add static html to ${indexHtmlBuildPath}`);
  }

  fs.writeFileSync(indexHtmlBuildPath, indexHtmlWithSSR);
}

const moduleUrl = process.argv[2];
const minify = (process.argv[3] || "").toLowerCase().trim() === "--prod";

if (!moduleUrl || !moduleUrl.startsWith("http")) {
  throw Error(
    `Expected module url argument, something like: \n
$ npx github:framer/bundler https://framer.com/m/framer/Site2.js\n\n`
  );
}

(async () => build(moduleUrl, minify))();
