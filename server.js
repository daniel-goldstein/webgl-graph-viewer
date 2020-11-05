const express = require("express");
const { resourceUsage } = require("process");
const app = express();

app.use(express.static("public"));
app.get("/", (_, res) => res.sendFile("/public/graph-viewer.html", { root: __dirname }));
app.listen(3000);
