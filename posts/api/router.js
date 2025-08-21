const express = require("express");
const router = express.Router();
const insane = require("insane");
const renderMarkdown = require("../../markdown.js");
const database = require("../../database.js")

const getLikeButton = (liked, postID) => {
  return `
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="20" height="20" 
    viewBox="0 0 24 24" 
    fill="${liked ? "red" : "none"}" 
    stroke="currentColor" 
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" 
    hx-swap="outerHTML" 
    hx-target="closest .like-interaction"
    hx-post="/posts/api/like" 
    hx-vals='{ "post": "${postID}" }' 
    class="feather feather-heart clickable like-button">
      <path fill="inherit" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
  </svg>`
}

const getCommentButton = (postID) => {
  return `
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" height="24" viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" 
    class="feather feather-message-square clickable comment-button"
    id="comment-button-for-${postID}">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>`
}

const renderComment = (content, blogTitle, commentID) => {
  return `
  <div class="comment">
    <div class="commenter"><a href="/blogs/view/${blogTitle}">${blogTitle}</a></div>
    <div class="comment-content">${content}</div>
    <div class="replies" 
      id="replies-for-${commentID}"
      hx-trigger="load" 
      hx-target="this"
      hx-swap="beforeend"
      hx-get="/posts/api/comments/replies?comment=${commentID}"></div>
  </div>`
}

router.post("/timeline", async (req, res) => {
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

    let [posts] = await database.query(
      `SELECT posts.*,
      COUNT(likes.id) as likeCount,
      MAX(CASE WHEN likes.blogID = ? THEN 1 ELSE 0 END) AS likedByBlog,
      COUNT(comments.id) as commentCount
      FROM posts 
      LEFT JOIN likes ON likes.postID = posts.id 
      LEFT JOIN comments ON comments.postID = posts.id
      WHERE posts.created_at < FROM_UNIXTIME(? / 1000) 
        AND posts.blogID IN (${placeholders}) 
      GROUP BY posts.id
      ORDER BY posts.created_at DESC 
      LIMIT 20`,
      [req.selectedBlog.id, req.query.before, ...ids]
    );

    let renderedPosts = [];

    for (let i = 0; i < posts.length; i++) {
      let [blog] = await database.query(`SELECT title, id FROM blogs WHERE id = ?`, [posts[i].blogID]);
      blog = blog[0];

      renderedPosts.push(`
        <div id="${posts[i].id}" class="post" timestamp="${Date.parse(posts[i].created_at)}">
          <div class="post-header"><a href="/blogs/view/${encodeURIComponent(blog.title)}">${blog.title}:</a></div>
          <div class="markdown">
            ${renderMarkdown(posts[i].content)}
          </div>
          <div class="interactions">
            <div class="like-interaction">
              ${posts[i].likeCount}
              ${getLikeButton(posts[i].likedByBlog, posts[i].id)}
            </div>
            <div class="comment-interaction" >
              ${posts[i].commentCount}
              ${getCommentButton(posts[i].id)}
            </div>
          </div>
          <div 
            class="comment-section closed" 
            id="comment-section-for-${posts[i].id}"
          >
            <div class="comments"
              hx-trigger="load"
              hx-get="/posts/api/comments?post=${posts[i].id}"
              hx-swap="beforeend"
              hx-target="this"
            ></div>
            <div class="comment-input">
              <form hx-post="/posts/api/create/comment" hx-target="previous .comments" hx-swap="beforeend">
                <input type="hidden" name="postID" value="${posts[i].id}">
                <input type="hidden" name="replying" value="false">
                <input type="hidden" name="commentID" value="null">
                <label for="content">Comment: </label><input name="content" type="text" minlength="2" maxlength="1024">
                <button type="submit">post</button>
              </form>
            </div>
          </div>
        </div>
      `)
    }


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
});

router.post("/create/comment", async (req, res) => {
  if (!req.authed) {
    res.status(401).send("UNAUTH");
    return;
  }

  if (req.body.content.length < 2 || req.body.content.length > 1024) {
    res.sendStatus(400);
    return;
  }

  const sanitizedContent = insane(req.body.content, { allowedTags: [] }); //strip all html

  try {
    if (req.body.replying == 'true') {
      //reply logic
    } else {
      // comment logic
      const [comment] = await database.query("INSERT INTO comments (content, postID, blogID) VALUES (?, ?, ?)", [sanitizedContent, req.body.postID, req.selectedBlog.id]);

      res.send(renderComment(sanitizedContent, req.selectedBlog.title, comment.insertId));
    }
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

router.post("/like", async (req, res) => {
  if (!req.authed || !req.selectedBlog) {
    res.status(401).send("UNAUTH");
    return;
  }

  try {
    let [postLiked] = await database.query("SELECT id FROM likes WHERE postID = ? AND blogID = ?", [req.body.post, req.selectedBlog.id]);
    let liked;

    if (postLiked.length === 0) {
      liked = true;
      await database.query("INSERT INTO likes (postID, blogID) VALUES (?, ?)", [req.body.post, req.selectedBlog.id]);
    } else {
      liked = false;
      await database.query("DELETE FROM likes WHERE id = ?", [postLiked[0].id]);
    }

    let [updatedLikeCount] = await database.query("SELECT COUNT(id) AS likeCount FROM likes WHERE postID = ?", [req.body.post]);

    res.send(`<div class="like-interaction">
      ${updatedLikeCount[0].likeCount}
      ${getLikeButton(liked, req.body.post)}
    </div>`)
  } catch (error) {
    console.error(error);
    return;
  }
})

router.get("/comments", async (req, res) => {
  if (!req.authed || !req.selectedBlog) {
    res.status(401).send("UNAUTH");
    return;
  }

  console.log("HIT");

  try {
    console.log(req.query);
    const [comments] = await database.query(`
      SELECT comments.*,
      blogs.title AS blogTitle 
      FROM comments 
      LEFT JOIN blogs ON comments.blogID = blogs.id
      WHERE comments.postID = ?
      GROUP BY comments.id`, [req.query.post])
    const renderedComments = comments.map((comment) => {
      return renderComment(comment.content, comment.blogTitle, comment.id)
    }).join("");

    res.send(renderedComments);

  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
})

router.get("/comments/replies", (req, res) => {
})

module.exports = router;


