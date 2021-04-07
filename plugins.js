const fetch = require("node-fetch");

exports.http = {
  name: "http",
  setup(build) {
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
      async function fetchUrl(url) {
        const response = await fetch(url);
        if (response.status === 200) {
          if (
            !url.endsWith(".js") &&
            response.headers.get("content-type").indexOf("text/html") !== -1
          ) {
            return fetchUrl(`${url}.js`);
          } else {
            return [response.url, await response.text()];
          }
        } else {
          throw new Error(`GET ${url} failed: status ${response.status}`);
        }
      }

      let [url, contents] = await fetchUrl(args.path);

      if (!contents) {
        throw new Error(
          `esbuild.http: no contents received for ${url} "${contents}"`
        );
      }

      // We patch the contents with the esm import.meta api
      contents = contents.replaceAll("import.meta", JSON.stringify({ url }));

      return { contents };
    });
  },
};
