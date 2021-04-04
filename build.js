#!/usr/bin/env node
const fs = require("fs");
const { join } = require("path");
const { webkit } = require("playwright");

const httpPlugin = {
  name: "http",
  setup(build) {
    let https = require("https");
    let http = require("http");

    // Intercept import paths starting with "http:" and "https:" so
    // esbuild doesn't attempt to map them to a file system location.
    // Tag them with the "http-url" namespace to associate them with
    // this plugin.
    build.onResolve({ filter: /^https?:\/\// }, (args) => ({
      path: args.path,
      namespace: "http-url",
    }));

    // We also want to intercept all import paths inside downloaded
    // files and resolve them against the original URL. All of these
    // files will be in the "http-url" namespace. Make sure to keep
    // the newly resolved URL in the "http-url" namespace so imports
    // inside it will also be resolved as URLs recursively.
    build.onResolve({ filter: /.*/, namespace: "http-url" }, (args) => ({
      path: new URL(args.path, args.importer).toString(),
      namespace: "http-url",
    }));

    // When a URL is loaded, we want to actually download the content
    // from the internet. This has just enough logic to be able to
    // handle the example import from unpkg.com but in reality this
    // would probably need to be more complex.
    build.onLoad({ filter: /.*/, namespace: "http-url" }, async (args) => {
      let contents = await new Promise((resolve, reject) => {
        function fetch(url) {
          console.log(`Downloading: ${url}`);
          let lib = url.startsWith("https") ? https : http;
          let req = lib
            .get(url, (res) => {
              if ([301, 302, 307].includes(res.statusCode)) {
                fetch(new URL(res.headers.location, url).toString());
                req.abort();
              } else if (res.statusCode === 200) {
                let chunks = [];
                res.on("data", (chunk) => chunks.push(chunk));
                res.on("end", () => {
                  const contents = String(Buffer.concat(chunks)).replaceAll(
                    "import.meta",
                    JSON.stringify({ url: url })
                  );

                  resolve(contents);
                });
              } else {
                reject(
                  new Error(`GET ${url} failed: status ${res.statusCode}`)
                );
              }
            })
            .on("error", reject);
        }
        fetch(args.path);
      });

      return { contents };
    });
  },
};

const TEMPLATES = {};

TEMPLATES["index.html"] = `
<html>
  <head></head>
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
    plugins: [httpPlugin],
    define: { "process.env.MODULE_URL": JSON.stringify(moduleUrl) },
    minify,
  });
}

async function buildHtml(url) {
  const browser = await webkit.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(url);
  console.log("page loaded");
  await page.screenshot({ path: join(buildPath, "site.png") });
  const html = await page.evaluate(() => window.__export());
  await browser.close();
  return html;
}

async function build() {
  await buildScript(
    "https://framer.com/m/framer/Site.js@0.1.0",
    join(buildPath, "web.js")
  );

  if (!fs.existsSync(indexHtmlTemplatePath)) {
    fs.writeFileSync(indexHtmlTemplatePath, TEMPLATES["index.html"]);
  }

  fs.copyFileSync(indexHtmlTemplatePath, indexHtmlBuildPath);

  const html = await buildHtml(`file://${indexHtmlBuildPath}`);

  const indexHtml = fs.readFileSync(indexHtmlBuildPath).toString();

  fs.writeFileSync(
    indexHtmlBuildPath,
    indexHtml.replaceAll(
      `<div id="main"></div>`,
      `<div id="main">${html}</div>`
    )
  );
}

(async () => build())();
