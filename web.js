import Framer from "framer";
import React from "react";
import ReactDOM from "react-dom";
import { renderToString } from "react-dom/server";

ReactDOM.renderToString = renderToString;

Object.assign(window, { Framer, React, ReactDOM });

window.__framer_importFromPackage = function (name) {
  return () =>
    React.createElement("div", {}, `Package component not supported: ${name}`);
};

function getDefaultExport(lib) {
  return lib.default ? lib.default : lib;
}

window.App = getDefaultExport(require(process.env.MODULE_URL));
