import express from 'express';
const router = express.Router();
import database from '../../database';
import { protect } from "../../auth/middleware";
import { Blog, Follow, ID, IsAuthedRequest, User } from 'types';
import { ResultSetHeader } from 'mysql2';
import { Session } from 'node:sqlite';
import { blogValidator, sanitizeInput } from 'src/validation';
import Joi from 'joi';

function getDefaultIndexPage(blogTitle: string) {
  return `# Welcome to ${blogTitle}
[posts (minimal)]`
}

router.post("/validate/title", protect((req) => ({ allowNoSelectedBlog: true })), async (req, res) => {
  if (!IsAuthedRequest(req)) {
    res.sendStatus(500);
    return;
  }

  let title = sanitizeInput(req.body.title);

  try {
    const { value, error } = blogValidator.validate({ title: title });

    if (error != undefined) {
      res.send(`<div id="title-result" class="error">${error.message}</div>`)
      return;
    }

    const [blogExists] = await database.query("SELECT title FROM blogs WHERE BINARY title = ?", value.title) as [Blog[], any];

    if (blogExists.length > 0) {
      res.send(`<div id='title-result' class='error'>${value.title} is already taken</div>`);
    }

    res.send('<div id="title-result"></div>')
  } catch (err) {
    req.logger.error(err)
    res.send("<div id='title-result' class='error'>SERVER ERROR</div>");
    return;
  }
})

router.post("/create", protect((req) => ({ allowNoSelectedBlog: true })), async (req, res) => {
  if (!IsAuthedRequest(req)) {
    res.sendStatus(500);
    return;
  }

  const title = sanitizeInput(req.body.title);

  try {
    const { value, error } = blogValidator.validate({ title: title })

    if (error != undefined) {
      res.send(`<div id='create-result' class='error'>${error.message}</div>`);
      return;
    }

    const [blogExists] = await database.query("SELECT title FROM blogs WHERE BINARY title = ?", [value.title]) as [Blog[], any];

    if (blogExists.length > 0) {
      res.send(`<div id="create-result" class="error">${value.title} is already taken</div>`)
      return;
    }

    const id = crypto.randomUUID();
    const [newBlog] = await database.query("INSERT INTO blogs (id, userID, title, stylesheet) VALUES (?, ?, ?, ?)", [id, req.user.id, value.title, ""]) as [Blog[], any];

    await database.query("UPDATE sessions SET selectedBlogID = ? WHERE id = ?", [id, req.token.uuid])

    if (req.blogs.length === 0) {
      await database.query("UPDATE users SET mainBlogID = ? WHERE id = ?", [id, req.user.id]);
    }

    const pageID = crypto.randomUUID();
    const [newBlogIndexPage] = await database.query(`
        INSERT INTO pages (id, title, content, blogID) 
        values (?, ?, ?, ?)`,
      [
        pageID,
        "index",
        getDefaultIndexPage(value.title),
        id
      ])

    res.set("HX-Refresh", 'true');

    res.send("<div id='create-result' class='success'>Blog created successfully, refresh to view it</div>")
  } catch (error) {
    req.logger.error(error);
    res.send("<div id='create-result' class='error'>SERVER ERROR</div>");
    return;
  }
});

router.put(
  "/select",
  protect((req) => ({ ownsBlog: { id: req.body.blog } })),
  async (req, res) => {
    if (!IsAuthedRequest(req)) {
      res.sendStatus(500);
      return;
    }

    res.set("HX-Refresh", 'true');

    try {
      let [requestedBlogs] = await database.query("SELECT id, userID FROM blogs WHERE id = ?", [req.body.blog]) as [Blog[], any];
      let requestedBlog = requestedBlogs[0];

      if (requestedBlog.userID != req.user.id) {
        res.status(401).send("UNAUTH");
        return;
      }

      await database.query("UPDATE sessions SET selectedBlogID = ? WHERE id = ?", [requestedBlog.id, req.token.uuid]); // select new one

      res.send("<div id='select-result' class='success'></div>");
      return;
    } catch (error) {
      req.logger.error(error);
      res.send("<div id='select-result' class='error'>SERVER ERROR</div>");
      return;
    }
  }
);

router.put("/select/main",
  protect((req) => ({ ownsBlog: { id: req.body.blog } })),
  async (req, res) => {
    if (!IsAuthedRequest(req)) {
      res.sendStatus(500);
      return;
    }

    res.set("HX-Refresh", 'true');

    try {
      let [requestedBlogs] = await database.query("SELECT id, userID FROM blogs where id = ?", [req.body.blog]) as [Blog[], any];
      let requestedBlog = requestedBlogs[0];

      if (requestedBlog.userID != req.user.id) {
        res.status(401).send("UNAUTH");
        return;
      }

      await database.query("UPDATE users SET mainBlogID = ? WHERE id = ?", [requestedBlog.id, req.user.id]);
      res.send("<div id='main-result' class='success'>Blog selected as main blog</div>")
      return;
    } catch (error) {
      req.logger.error(error)
      res.send("<div id='main-result' class='error'>SEVER ERROR</div>")
    }
  }
);

router.post("/delete/:id",
  protect((req) => ({ ownsBlog: { id: req.params.id } })),
  async (req, res) => {
    if (!IsAuthedRequest(req)) {
      res.sendStatus(500);
      return;
    }

    res.set("HX-Refresh", 'true');

    try {
      let [ownsBlog] = await database.query("SELECT id FROM blogs WHERE id = ? AND userID = ?", [req.params.id, req.user.id]) as [Blog[], any];
      let [mainBlog] = await database.query("SELECT mainBlogID FROM users WHERE id = ? AND mainBlogID = ?", [req.user.id, req.params.id]) as [User[], any];
      let [selectedBlog] = await database.query("SELECT selectedBlogID FROM sessions WHERE id = ? AND selectedBlogID = ?", [req.token.uuid, req.params.id]) as [Session[], any];

      if (ownsBlog.length === 0) {
        res.status(401).send("UNAUTH");
        return;
      }

      if (mainBlog.length !== 0) {
        await database.query("UPDATE users SET mainBlogID = ? WHERE id = ?", [null, req.user.id])
      }

      if (selectedBlog.length !== 0) {
        await database.query("UPDATE sessions SET selectedBlogID = ? WHERE id = ?", [null, req.token.uuid])
      }

      await database.query("DELETE FROM blogs WHERE id = ?", [req.params.id])

      res.send("<div id='#delete-result' class='success'>Deleted!</div>")
    } catch (error) {
      req.logger.error(error)
      res.send("<div id='delete-result' class='error'>SERVER ERROR</div>")
      return;
    }
  }
);

router.post("/follow", protect(), async (req, res) => {
  if (!IsAuthedRequest(req) || req.selectedBlog == null) {
    res.sendStatus(500);
    return;
  }

  try {
    const [ownsBlog] = await database.query("SELECT userID FROM blogs WHERE id = ? AND userID = ?", [req.query.blog, req.user.id]) as [Blog[], any];
    const [followsBlog] = await database.query("SELECT followed_blogID FROM follows WHERE following_blogID = ? AND followed_blogID = ?", [req.selectedBlog.id, req.query.blog]) as [Follow[], any];

    if (ownsBlog.length !== 0) {
      res.send("<div id='follow-result' class='error'>You own this blog</div>");
      return;
    }

    if (followsBlog.length !== 0) {
      res.send("<div id='follow-result class='error'>You already follow this blog</div>");
      return
    }

    res.set("HX-Refresh", 'true');

    await database.query("INSERT INTO follows (followed_blogID, following_blogID) VALUES (?, ?)", [req.query.blog, req.selectedBlog.id]);

    res.send("<div id='follow-result' class='success'>Followed!</div>")
  } catch (error) {
    req.logger.error(error);
    res.send("<div id='follow-result' class='error'>SERVER ERROR</div>");
    return;
  }
});

router.post("/search", protect(), async (req, res) => {
  if (!req.authed) {
    res.status(401).send("UNAUTH");
    return
  }

  const searchValidator = Joi.string().min(1).max(256).trim();
  const sanitizedSearch = sanitizeInput(req.body.search);
  const { value, error } = searchValidator.validate(sanitizedSearch);

  if (error != undefined) {
    return;
  }

  try {
    const [blogs] = await database.query("SELECT title FROM blogs WHERE MATCH(title) AGAINST (? IN NATURAL LANGUAGE MODE)", [value]) as [Blog[], any];

    const renderedBlogs = blogs.map((blog) => {
      return `<div class='search-result'><a href='/blogs/view/${encodeURIComponent(blog.title)}'>${blog.title}</a></div>`
    }).join("");

    res.send(renderedBlogs);
  } catch (error) {
    req.logger.error(error)
    res.send("<div id='search-result' class='error'>SERVER ERROR</div>")
  }

});

export default router;

