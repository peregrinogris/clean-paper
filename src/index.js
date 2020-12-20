const express = require("express");
const favicon = require("serve-favicon");
const http = require("http");
const path = require("path");

const parse = require("../api/parse");

const app = express();

app.use("/", express.static(path.join(__dirname, "../public")));
app.use(favicon(path.join(__dirname, "../public", "favicon.ico")));

app.get("*", (req, res) => {
  req.query.url = req.params[0];
  parse(req, res);
});

const PORT = 5050;
http.createServer(app).listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});
