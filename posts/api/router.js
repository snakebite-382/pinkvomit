const express = require("express");
const router = express.Router();
const renderMarkdown = require("../../markdown.js");
const database = require("../../database.js")

router.get("/timeline", async (req, res) => {
  if (!req.authed) {
    res.status(401).send("UNAUTH");
    return;
  }

  if (req.selectedBlog == null) {
    res.send("<div class='error'>You need to create a blog before viewing your timeline</div>");
    return;
  }

  try {
    let [followsIDs] = await database.query("SELECT followed_blogID FROM follows WHERE following_blogID = ?", [req.selectedBlog.id])

    followsIDs = followsIDs.map((value) => value.followed_blogID);

    let ids = [req.selectedBlog.id, ...followsIDs];

    const placeholders = ids.map(() => '?').join(",");

    let [posts] = await database.query(`SELECT * FROM posts WHERE created_at < FROM_UNIXTIME(? / 1000) AND blogID IN (${placeholders}) ORDER BY created_at DESC LIMIT 10`, [req.query.before, ...ids]);

    let renderedPosts = [];

    for (let i = 0; i < posts.length; i++) {
      console.log(posts[i])
      renderedPosts.push(`<div id="post" timestamp="${Date.parse(posts[i].created_at)}">${renderMarkdown(posts[i].content)}</div>`)
    }

    console.log(renderedPosts.join(""))

    res.send(renderedPosts.join(""))
  } catch (error) {
    console.error(error);
    res.send("<div id='timeline-result' class='error'>SERVER ERROR</div>")
  }
})

router.post("/preview", (req, res) => {
  res.send(`<div id='preview-result' class='markdown'> ${renderMarkdown(req.body.content)}</div>`)
})

router.post("/create", async (req, res) => {
  if (!req.authed) {
    res.status(401).send("UNAUTH");
    return;
  }

  try {
    await database.query("INSERT INTO posts (content, blogID) VALUES (?, ?)", [req.body.content, req.selectedBlog.id]);
    res.send("<div id='create-result' class='success'>Post Created!</div>")
  } catch (error) {
    console.error(error)
    res.send("<div id='create-result' class='error'>SERVER ERROR</div>")
  }
})

module.exports = router;


