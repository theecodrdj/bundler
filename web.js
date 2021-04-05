import React from "react";
import Framer from "framer";
import { render, hydrate } from "react-dom";
import { renderToString } from "react-dom/server";

window.React = React;
window.Framer = Framer;
window.__framer_importFromPackage = function () {
  return "div";
};

let App = require(process.env.MODULE_URL);

if (App.default) {
  App = App.default;
}

window.App = App;
window.__export = () => renderToString(React.createElement(App));

document.addEventListener("DOMContentLoaded", function () {
  const el = document.getElementById("main");

  if (!el) {
    throw Error(`Could not find a <div> with id "main"`);
  }

  if (!el.innerHTML) {
    console.log("render");
    render(React.createElement(App), el);
  } else {
    setTimeout(() => {
      console.log("hydrate");
      hydrate(React.createElement(App), el);
    }, 0);
  }
});
