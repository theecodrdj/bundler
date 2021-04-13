const { getScript } = require("../build");

module.exports = async (req, res) => {
  const script = await getScript("https://framer.com/m/framer/Site2.js");

  res.json({
    body: req.body,
    query: req.query,
    cookies: req.cookies,
    script: script,
  });
};
