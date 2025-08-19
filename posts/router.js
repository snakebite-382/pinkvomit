const express = require("express")
const router = express.Router();
const render = require("../templating.js");

const apiRouter = require("./api/router.js");
router.use("/api", apiRouter);

router.get("/timeline", (req, res) => {
  render(req, res, "posts/timeline", "TIMELINE");
})

router.get("/create", (req, res) => {
  render(req, res, "posts/create", "CREATE POST")
})


module.exports = router
