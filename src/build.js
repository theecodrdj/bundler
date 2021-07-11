#!/usr/bin/env node
const fs = require("fs");
const { join } = require("path");
const { getScript, getStatic, getPageHTML } = require("./lib");

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
  const script = await getScript(
    moduleUrl,
    minify,
    (framerLibraryPath =
      "/Users/koen/Documents/Projects/FramerStudio/src/library/build/framer.js")
  );

  write(scriptBuildPath, script);

  const template = fs.readFileSync(indexHtmlTemplatePath).toString();
  const html = getPageHTML(
    template,
    getStatic(join(buildPath, `${scriptName}.js`))
  );
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
