#!/usr/bin/env node
import fs from "fs"
import { join } from "path";
import { getScript, getStatic, getHTML } from "./lib.js"

const scriptName = "web";
const indexHtmlTemplate = `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
        html, body, #main {
        height: 100%;
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      * {
        box-sizing: inherit;
      }

      @font-face { src: url("https://framerusercontent.com/modules/2jGzqJXvGDEMb7VkiBXQ/Bv0k4Y2l6czijl8MehOV/assets/lYafHVZwqgZrS8IJan5h2BTNNK0.ttf"); font-family: "GT Walsheim Medium" }
      @font-face { src: url("https://framerusercontent.com/modules/2jGzqJXvGDEMb7VkiBXQ/Bv0k4Y2l6czijl8MehOV/assets/BEQRVDgs6J93DgS3UCYfVmYVd2E.ttf"); font-family: "GT Walsheim Bold" }
      @font-face { src: url("https://framerusercontent.com/modules/2jGzqJXvGDEMb7VkiBXQ/Bv0k4Y2l6czijl8MehOV/assets/8TMEc25pgQJN4vUT0GWMDu1xY.ttf"); font-family: "GT Walsheim Regular" }
      @font-face { src: url("https://framerusercontent.com/modules/2jGzqJXvGDEMb7VkiBXQ/Bv0k4Y2l6czijl8MehOV/assets/mRihjkkGRh1cPifFI5NK2daGo.ttf"); font-family: "GT Walsheim Regular Oblique" }
    </style>
  </head>
  <body>
    <div id="main"></div>
    <script src="./${scriptName}.js"></script>
    <script>
      document.addEventListener("DOMContentLoaded", () => {
        Framer.MainLoop.start() // Required by DataObserver
        ReactDOM.hydrate(
            React.createElement(window.App),
            document.getElementById("main")
        )

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

async function build(moduleUrl, importMap, minify = false) {
  // Clean out the old build folder if it's there
  rm(buildPath);
  fs.mkdirSync(buildPath);

  write(indexHtmlTemplatePath, indexHtmlTemplate, true);

  // Build the main js using esbuild and bundle in a single script
  const scriptBuildPath = join(buildPath, `${scriptName}.js`);
  const script = await getScript(moduleUrl, importMap, minify);

  write(scriptBuildPath, script);

  const template = fs.readFileSync(indexHtmlTemplatePath).toString();

  let html = template;

  try {
    html = getHTML(
      template,
      await getStatic(join(buildPath, `${scriptName}.js`))
    );
  } catch (error) {
    console.log("*** Could not render html for ssr\n", error)
  }



  // const html = template

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


const importMap = {
  "imports": {
    "framer": "https://app.framerstatic.com/library.5YWWZ3RV.js",
    "framer-motion": "https://app.framerstatic.com/framer-motion-esm-shim.DAYYF345.js",
    "react": "https://ga.jspm.io/npm:react@17.0.2/index.js",
    "react-dom": "https://ga.jspm.io/npm:react-dom@17.0.2/index.js",
    "react/jsx-runtime": "https://ga.jspm.io/npm:react@17.0.2/jsx-runtime.js",
    "framer:screens/ZyRmUVn6L": "https://framerusercontent.com/modules/irP4bhwiKwthkywwmbLi/wPA3evQ7JiXyxo4GG5nB/ZyRmUVn6L.js",
    "framer:screens/sCioVo_1D": "https://framerusercontent.com/modules/NzE2lus9FQD4Uzu5lcvh/QK2OpbFRXdGS20gjrR2i/sCioVo_1D.js",
    "framer:screens/AhtKjy2EC": "https://framerusercontent.com/modules/PrAEpiosXTTxJQMePm1Z/PjGWJq6CC2nsoLmGygcg/AhtKjy2EC.js"
  },
  "scopes": {
    "https://ga.jspm.io/": {
      "object-assign": "https://ga.jspm.io/npm:object-assign@4.1.1/index.js",
      "scheduler": "https://ga.jspm.io/npm:scheduler@0.20.2/index.js"
    }
  }
}

build(moduleUrl, importMap, minify)
