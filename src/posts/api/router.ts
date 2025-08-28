import express from 'express';
const router = express.Router();
import insane from 'insane';
import { renderMarkdown, sanitizeMarkdown } from '../../markdown';
import database from '../../database';
import { protect } from '../../auth/middleware';
import { Follow, IsAuthedRequest, Post, TimelineComment, TimelinePost, TimelineReply } from "types";
import { renderLikeButton, renderCommentButton, renderPost, renderComment, renderReply } from '../render';
import { ResultSetHeader } from 'mysql2';
import { contentValidator, sanitizeInput } from 'src/validation';


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
        COUNT(DISTINCT likes.id) as likeCount,
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
      renderedPosts.push(renderPost(posts[i]));
    }

    res.send(renderedPosts.join(""))
  } catch (error) {
    req.logger.error(error)
    res.send("<div id='timeline-result' class='error'>SERVER ERROR</div>")
  }
});

router.get("/blog/:title", protect(), async (req, res) => {
  if (!IsAuthedRequest(req)) {
    res.sendStatus(500);
    return;
  }

  try {
    let [posts] = await database.query(
      `SELECT 
        posts.*,
        COUNT(DISTINCT likes.id) AS likeCount,
        MAX(CASE WHEN likes.blogID = blogs.id THEN 1 ELSE 0 END) AS likedByBlog,
        COUNT(DISTINCT comments.id) AS commentCount,
        blogs.title AS blogTitle
      FROM posts
      LEFT JOIN comments ON comments.postID = posts.id
      LEFT JOIN likes ON likes.postID = posts.id
      JOIN blogs ON blogs.id = posts.blogID
      WHERE blogs.title = ?
      GROUP BY posts.id
      ORDER BY posts.created_at DESC
    `, [req.params.title, req.params.title]) as [TimelinePost[], any]

    let renderedPosts: string[] = [];

    for (let i = 0; i < posts.length; i++) {
      renderedPosts.push(renderPost(posts[i], req.query.minimal === "true"))
    }

    res.send(renderedPosts.join(""));
  } catch (error) {
    req.logger.error(error)
    res.sendStatus(500)
    return
  }
})

router.post("/preview", protect(), (req, res) => {
  const { value, error } = contentValidator.validate(sanitizeMarkdown(req.body.content));

  if (error != undefined) {
    res.send(`<div id="preview-result" class="error">${error.message}</div>`)
  }

  res.send(`<div id='preview-result' class='markdown'> ${renderMarkdown(value)}</div>`)
});

router.post("/create", protect(), async (req, res) => {
  if (!IsAuthedRequest(req) || req.selectedBlog == null) {
    res.sendStatus(500);
    return;
  }

  const sanitizedContent = sanitizeMarkdown(req.body.content);
  const { value, error } = contentValidator.validate(sanitizedContent);

  if (error != undefined) {
    res.send(`<div id="create-result" class="error">${error.message}</div>`)
    return;
  }

  try {
    await database.query("INSERT INTO posts (content, blogID) VALUES (?, ?)", [value, req.selectedBlog.id]);
    res.send("<div id='create-result' class='success'>Post Created!</div>")
  } catch (error) {
    req.logger.error(error)
    res.send("<div id='create-result' class='error'>SERVER ERROR</div>")
    return;
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

  const sanitizedContent = sanitizeInput(req.body.content)
  const { value, error } = contentValidator.validate(sanitizedContent);

  if (error != undefined) {
    res.sendStatus(400);
    return;
  }

  const id = crypto.randomUUID();

  try {
    if (req.body.replying == 'true') {
      //reply logic
      const [replyInsert] = await database.query<ResultSetHeader>("INSERT INTO replies (id, content, commentID, blogID, atBlog) VALUES (?, ?, ?, ?, ?)", [id, value, req.body.commentID, req.selectedBlog.id, req.body.atBlog])
      const reply: TimelineReply = {
        content: value,
        blogTitle: req.selectedBlog.title,
        atBlog: req.body.atBlog,
        id: id,
        created_at: new Date(),
        updated_at: new Date(),
        commentID: req.body.commentID,
        blogID: req.selectedBlog.id
      }


      res.send(`
        <div hx-swap-oob="beforeend:#comment-replies-for_${req.body.commentID}">
          ${renderReply(reply)}
        </div>`);
    } else {
      // comment logic
      const [commentInsert] = await database.query<ResultSetHeader>("INSERT INTO comments (id, content, postID, blogID) VALUES (?, ?, ?, ?)", [id, value, req.body.postID, req.selectedBlog.id]);
      const comment: TimelineComment = {
        id: id,
        content: value,
        blogID: req.selectedBlog.id,
        blogTitle: req.selectedBlog.title,
        postID: req.body.postID,
        created_at: new Date(),
        updated_at: new Date(),
      }

      res.send(renderComment(comment));
    }
  } catch (error) {
    req.logger.error(error);
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
    req.logger.error(error)
    return;
  }
})

router.get("/comments", protect(), async (req, res) => {
  if (!IsAuthedRequest(req)) {
    res.sendStatus(500);
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
      return renderComment(comment)
    }).join("");

    res.send(renderedComments);

  } catch (error) {
    req.logger.error(error);
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
      return renderReply(reply);
    }).join("")

    res.send(renderedReplies);
  } catch (error) {
    req.logger.error(error)
    res.sendStatus(500);
    return;
  }
});

export default router;

