const express = require("express")
const router = express.Router();
const render = require("../templating.js");
const { protect } = require("../auth/middleware.js");

const apiRouter = require("./api/router.js");
router.use("/api", apiRouter);

router.get("/timeline", protect(), (req, res) => {
  render(req, res, "posts/timeline", "TIMELINE");
})

router.get("/create", protect(), (req, res) => {
  render(req, res, "posts/create", "CREATE POST")
})


module.exports = router
