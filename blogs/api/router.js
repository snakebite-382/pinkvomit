const express = require('express');
const router = express.Router();
const database = require("../../database.js");

const validateTitle = async (title, userID) => {
  const validCharacters = "qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM1234567890-_*[]()^!.";
  let valid = true;
  let invalidChars = []

  for (let i = 0; i < title.length; i++) {
    let character = title.charAt(i);
    if (!validCharacters.includes(character)) {
      valid = false;
      invalidChars.push(character)
    }
  }

  const [rows] = await database.query("SELECT title FROM blogs WHERE title = ? and userID = ?", [title, userID]);

  if (rows.length !== 0) {
    valid = false;
  }

  return [valid, invalidChars];
}

router.post("/validate/title", async (req, res) => {
  if (!req.authed) {
    res.status(401).send("UNAUTH");
    return;
  }

  try {
    const [valid, invalidChars] = await validateTitle(req.body.title, req.user.id)
    if (valid) {
      res.send('')
    } else {
      if (invalidChars.length > 0) {
        res.send(`Title contains invalid characters: "${invalidChars.toString()}"`)
      } else {
        res.send(`You already have a blog titled: ${req.body.title}`);
      }
    }
  } catch (err) {
    console.error(err);
    res.send("SERVER ERROR");
  }
})

router.post("/create", async (req, res) => {
  if (!req.authed) {
    res.status(401).send("UNAUTH");
    return;
  }


  try {
    const [valid, _] = await validateTitle(req.body.title, req.user.id)

    if (valid) {
      const [newBlog] = await database.query("INSERT INTO blogs (userID, title, stylesheet) VALUES (?, ?, ?)", [req.user.id, req.body.title, ""]);;

      await database.query("UPDATE sessions SET selectedBlogID = ? WHERE uuid = ?", [newBlog.insertId, req.token.uuid])

      if (req.blogs.length === 0) {
        await database.query("UPDATE users SET mainBlogID = ? WHERE id = ?", [newBlog.insertId, req.user.id]);
      }

      res.set("HX-Refresh", true);

      res.send("<div id='create-result' class='success'>Blog created successfully, refresh to view it</div>")
    } else {
      res.send("<div id='create-result' class='error'>Some inputs are invalid</div>");
    }
  } catch (error) {
    console.error(error);
    res.send("<div id='create-result' class='error'>SERVER ERROR</div>");
  }
});

router.put("/select", async (req, res) => {
  if (!req.authed) {
    res.status(401).send("UNAUTH")
    return;
  }

  res.set("HX-Refresh", true);

  try {
    let [requestedBlog] = await database.query("SELECT id, userID FROM blogs WHERE id = ?", [req.body.blog]);
    requestedBlog = requestedBlog[0]

    if (requestedBlog.userID != req.user.id) {
      res.status(401).send("UNAUTH");
      return;
    }

    await database.query("UPDATE sessions SET selectedBlogID = ? WHERE uuid = ?", [requestedBlog.id, req.token.uuid]); // select new one

    res.send("<div id='select-result' class='success'></div>");
    return;
  } catch (error) {
    console.error(error);
    res.send("<div id='select-result' class='error'>SERVER ERROR</div>");
  }
})

router.put("/select/main", async (req, res) => {
  if (!req.authed) {
    res.status(401).send("UNAUTH");
    return;
  }

  res.set("HX-Refresh", true);


  try {
    let [requestedBlog] = await database.query("SELECT id, userID FROM blogs where id = ?", [req.body.blog]);
    requestedBlog = requestedBlog[0];

    if (requestedBlog.userID != req.user.id) {
      res.status(401).send("UNAUTH");
      return;
    }

    await database.query("UPDATE users SET mainBlogID = ? WHERE id = ?", [requestedBlog.id, req.user.id]);
    res.send("<div id='main-result' class='success'>Blog selected as main blog</div>")
    return;
  } catch (error) {
    console.error(error)
    res.send("<div id='main-result' class='error'>SEVER ERROR</div>")
  }
})

router.post("/delete/:id", async (req, res) => {
  if (!req.authed) {
    res.status(401).send("UNAUTH");
    return;
  }

  res.set("HX-Refresh", true)

  try {
    let [ownsBlog] = await database.query("SELECT id FROM blogs WHERE id = ? AND userID = ?", [req.params.id, req.user.id])
    let [mainBlog] = await database.query("SELECT mainBlogID FROM users WHERE id = ? AND mainBlogID = ?", [req.user.id, req.params.id]);
    let [selectedBlog] = await database.query("SELECT selectedBlogID FROM sessions WHERE uuid = ? AND selectedBlogID = ?", [req.token.uuid, req.params.id])

    if (ownsBlog.length === 0) {
      res.status(401).send("UNAUTH");
      return;
    }

    if (mainBlog.length !== 0) {
      await database.query("UPDATE users SET mainBlogID = ? WHERE id = ?", [null, req.user.id])
    }

    if (selectedBlog.length !== 0) {
      await database.query("UPDATE sessions SET selectedBlogID = ? WHERE uuid = ?", [null, req.token.uuid])
    }

    await database.query("DELETE FROM blogs WHERE id = ?", [req.params.id])

    res.send("<div id='#delete-result' class='success'>Deleted!</div>")
  } catch (error) {
    console.error(error);
    res.send("<div id='delete-result' class='error'> ")
  }
})

router.post("/follow", async (req, res) => {
  if (!req.authed) {
    res.status(401).send("UNAUTH");
    return;
  }

  if (req.selectedBlog == null) {
    res.send("<div id='follow_result' class='error'>You need to make a blog before you can follow other blogs</div>");
    return;
  }

  try {
    const [ownsBlog] = await database.query("SELECT userID FROM blogs WHERE id = ? AND userID = ?", [req.query.blog, req.user.id]);
    const [followsBlog] = await database.query("SELECT followed_blogID FROM follows WHERE following_blogID = ? AND followed_blogID = ?", [req.selectedBlog.id, req.query.blog]);

    if (ownsBlog.length !== 0) {
      res.send("<div id='follow-result' class='error'>You own this blog</div>");
      return;
    }

    if (followsBlog.length !== 0) {
      res.send("<div id='follow-result class='error'>You already follow this blog</div>");
      return
    }

    res.set("HX-Refresh", true);

    await database.query("INSERT INTO follows (followed_blogID, following_blogID) VALUES (?, ?)", [req.query.blog, req.selectedBlog.id]);

    res.send("<div id='follow-result' class='success'>Followed!</div>")
  } catch (error) {
    console.error(error)
    res.send("<div id='follow-result' class='error'>SERVER ERROR</div>");
    return;
  }
})

router.post("/search", async (req, res) => {
  if (!req.authed) {
    res.status(401).send("UNAUTH");
    return
  }

  try {
    const [blogs] = await database.query("SELECT title FROM blogs WHERE MATCH(title) AGAINST (? IN NATURAL LANGUAGE MODE)", [req.body.search]);

    const renderedBlogs = blogs.map((blog) => {
      return `<div class='search-result'><a href='/blogs/view/${encodeURIComponent(blog.title)}'>${blog.title}</a></div>`
    }).join("");

    console.log(renderedBlogs)

    res.send(renderedBlogs);
  } catch (error) {
    console.error(error)
    res.send("<div id='search-result' class='error'>SERVER ERROR</div>")
  }

})

module.exports = router;
