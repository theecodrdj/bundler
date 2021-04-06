import React from "react";
import Framer from "framer";
import { render, hydrate } from "react-dom";
import { renderToString } from "react-dom/server";

window.React = React;
window.Framer = Framer;
window.__framer_importFromPackage = function (name) {
  return () =>
    React.createElement("div", {}, `Package component not supported: ${name}`);
};

function getMainElement() {
  const el = document.getElementById("main");
  if (!el) throw Error(`Could not find a <div> with id "main"`);
  return el;
}

function getDefaultExport(lib) {
  return lib.default ? lib.default : lib;
}

const App = getDefaultExport(require(process.env.MODULE_URL));

window.__export = () => {
  const html = renderToString(React.createElement(App));
  render(React.createElement(App), getMainElement());

  // Pick up the last inserted style after rendering
  const stylesAfter = document.head.getElementsByTagName("style");
  const style =
    stylesAfter.length > 1 ? stylesAfter[stylesAfter.length - 1].innerText : "";

  return [html, style];
};

document.addEventListener("DOMContentLoaded", () => {
  hydrate(React.createElement(App), getMainElement());
});
