const express = require("express");
const router = express.Router();
const render = require('../templating.js');
const apiRouter = require('./api/router.js');
const database = require("../database.js");

router.use("/api", apiRouter)

router.get("/manage", (req, res) => {
  render(req, res, "blogs/manage", "MANAGE BLOGS")
})

router.get("/view/id/:id", async (req, res) => {
  let blogTitle;
  try {
    [blogTitle] = await database.query("SELECT title FROM blogs WHERE id = ?", [req.params.id]);

    if (blogTitle.length === 0) {
      res.set("Hx-Redirect", "/");
      res.send("<div id='view-result' class='error'> Blog Not Found! Redirecting...</div>")
    }

    blogTitle = blogTitle[0].title;

  } catch (error) {
    console.error(error);
    res.sendStatus(500)
    return;
  }
  res.set("Hx-Redirect", `/blogs/view/${blogTitle}`)
  res.send("<div id='view-result' class='warning'>Redirecting...</div>")
})

router.get("/view/:title", async (req, res) => {
  let viewedBlog;
  let followsBlog;

  try {
    [viewedBlog] = await database.query("SELECT * FROM blogs WHERE title = ?", [req.params.title]);
    viewedBlog = viewedBlog[0];
    [followsBlog] = await database.query("SELECT followed_blogID FROM follows WHERE followed_blogID = ? AND following_blogID = ?", [viewedBlog.id, req.selectedBlog.id]);
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
