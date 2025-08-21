const express = require("express");
const router = express.Router();
const render = require('../templating.js');
const apiRouter = require('./api/router.js');
const database = require("../database.js");

router.use("/api", apiRouter)

router.get("/manage", (req, res) => {
  render(req, res, "blogs/manage", "MANAGE BLOGS")
})

router.get("/view/:title", async (req, res) => {
  let viewedBlog;
  let followsBlog;

  try {
    [viewedBlog] = await database.query("SELECT * FROM blogs WHERE title = ?", [req.params.title]);
    viewedBlog = viewedBlog[0];
    [followsBlog] = await database.query("SELECT followed_blogID FROM follows WHERE followed_blogID = ?", [viewedBlog.id]);
    followsBlog = followsBlog[0];
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
    return;
  }

  let vars = { viewedBlog: viewedBlog, ownsBlog: false, followsBlog: false };

  if (viewedBlog.userID == req.user.id) {
    vars.ownsBlog = true;
  }

  if (followsBlog !== undefined) {
    vars.followsBlog = true;
  }

  render(req, res, "blogs/view", `VIEW ${req.query.title}`, vars)
})

router.get("/search", async (req, res) => {
  render(req, res, "blogs/search", "SEARCH BLOGS")
})

module.exports = router;
