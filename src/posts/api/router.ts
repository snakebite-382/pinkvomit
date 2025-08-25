import express from 'express';
const router = express.Router();
import insane from 'insane';
import renderMarkdown from '../../markdown';
import database from '../../database';
import { protect } from '../../auth/middleware';
import { Follow, IsAuthedRequest, Post, TimelineComment, TimelinePost, TimelineReply } from "types";
import { renderLikeButton, renderCommentButton, renderPost, renderComment, renderReply } from '../render';
import { ResultSetHeader } from 'mysql2';


router.post("/timeline", protect(), async (req, res) => {
  if (!IsAuthedRequest(req) || req.selectedBlog == null) {
    res.sendStatus(500);
    return;
  }

  try {
    let [followsIDQuery] = await database.query("SELECT followed_blogID FROM follows WHERE following_blogID = ?", [req.selectedBlog.id]) as [Follow[], any];

    let followsIDs = followsIDQuery.map((value) => value.followed_blogID);

    let ids = [req.selectedBlog.id, ...followsIDs];

    const placeholders = ids.map(() => '?').join(",");

    let [posts] = await database.query(
      `SELECT posts.*,
      COUNT(likes.id) as likeCount,
      MAX(CASE WHEN likes.blogID = ? THEN 1 ELSE 0 END) AS likedByBlog,
      COUNT(comments.id) as commentCount,
      blogs.title as blogTitle
      FROM posts 
      LEFT JOIN likes ON likes.postID = posts.id 
      LEFT JOIN comments ON comments.postID = posts.id
      LEFT JOIN blogs ON posts.blogID = blogs.id
      WHERE posts.created_at < FROM_UNIXTIME(? / 1000) 
        AND posts.blogID IN (${placeholders}) 
      GROUP BY posts.id
      ORDER BY posts.created_at DESC 
      LIMIT 20`,
      [req.selectedBlog.id, req.query.before, ...ids]
    ) as [TimelinePost[], any];

    let renderedPosts = [];

    for (let i = 0; i < posts.length; i++) {
      let p = posts[i];

      renderedPosts.push(renderPost(p.id, p.created_at, p.blogTitle, p.content, p.likedByBlog, p.likeCount, p.commentCount));
    }

    res.send(renderedPosts.join(""))
  } catch (error) {
    console.error(error);
    res.send("<div id='timeline-result' class='error'>SERVER ERROR</div>")
  }
});

router.post("/preview", protect(), (req, res) => {
  res.send(`<div id='preview-result' class='markdown'> ${renderMarkdown(req.body.content)}</div>`)
});

router.post("/create", protect(), async (req, res) => {
  if (!IsAuthedRequest(req) || req.selectedBlog == null) {
    res.sendStatus(500);
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

router.post("/create/comment", protect(), async (req, res) => {
  if (!IsAuthedRequest(req) || req.selectedBlog == null) {
    res.sendStatus(500);
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
      const [reply] = await database.query<ResultSetHeader>("INSERT INTO replies (content, commentID, blogID, atBlog) VALUES (?, ?, ?, ?)", [sanitizedContent, req.body.commentID, req.selectedBlog.id, req.body.atBlog])

      res.send(`
        <div hx-swap-oob="beforeend:#replies-for-${req.body.commentID}">
          ${renderReply(sanitizedContent, req.selectedBlog.title, req.body.atBlog, reply.insertId)}
        </div>`);
    } else {
      // comment logic
      const [comment] = await database.query<ResultSetHeader>("INSERT INTO comments (content, postID, blogID) VALUES (?, ?, ?)", [sanitizedContent, req.body.postID, req.selectedBlog.id]);

      res.send(renderComment(sanitizedContent, req.selectedBlog.title, comment.insertId));
    }
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

router.post("/like", protect(), async (req, res) => {
  if (!IsAuthedRequest(req) || req.selectedBlog == null) {
    res.sendStatus(500);
    return;
  }

  try {
    let [postLiked] = await database.query("SELECT id FROM likes WHERE postID = ? AND blogID = ?", [req.body.post, req.selectedBlog.id]) as [Post[], any];
    let liked;

    if (postLiked.length === 0) {
      liked = true;
      await database.query("INSERT INTO likes (postID, blogID) VALUES (?, ?)", [req.body.post, req.selectedBlog.id]);
    } else {
      liked = false;
      await database.query("DELETE FROM likes WHERE id = ?", [postLiked[0].id]);
    }

    let [updatedLikeCount] = await database.query("SELECT COUNT(id) AS likeCount FROM likes WHERE postID = ?", [req.body.post]) as [[{ likeCount: number }], any];

    res.send(`<div class="like-interaction">
      ${updatedLikeCount[0].likeCount}
      ${renderLikeButton(liked, req.body.post)}
    </div>`)
  } catch (error) {
    console.error(error);
    return;
  }
})

router.get("/comments", protect(), async (req, res) => {
  if (!req.authed || !req.selectedBlog) {
    res.status(401).send("UNAUTH");
    return;
  }

  try {
    const [comments] = await database.query(`
      SELECT comments.*,
      blogs.title AS blogTitle 
      FROM comments 
      LEFT JOIN blogs ON comments.blogID = blogs.id
      WHERE comments.postID = ?
      GROUP BY comments.id`, [req.query.post]) as [TimelineComment[], any];
    const renderedComments = comments.map((comment) => {
      return renderComment(comment.content, comment.blogTitle, comment.id)
    }).join("");

    res.send(renderedComments);

  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
})

router.get("/comments/replies", protect(), async (req, res) => {
  try {
    const [replies] = await database.query(`
      SELECT replies.*,
      blogs.title as blogTitle
      FROM replies
      LEFT JOIN blogs ON replies.blogID = blogs.id
      WHERE replies.commentID = ?
      GROUP BY replies.id`, [req.query.comment]) as [TimelineReply[], any];

    const renderedReplies = replies.map((reply) => {
      return renderReply(reply.content, reply.blogTitle, reply.atBlog, reply.id);
    }).join("")

    res.send(renderedReplies);
  } catch (error) {
    console.error(error)
    res.sendStatus(500)
  }
});

export default router;

