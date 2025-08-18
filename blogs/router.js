const express = require("express");
const router = express.Router();
const render = require('../templating.js');
const apiRouter = require('./api/router.js');

router.use("/api", apiRouter)

router.get("/manage", (req, res) => {
  render(req, res, "blogs/manage", "MANAGE BLOGS")
})

module.exports = router;
