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

  res.set("HX-Refresh", true);

  try {
    const [valid, _] = await validateTitle(req.body.title, req.user.id)

    if (valid) {
      const [newBlog] = await database.query("INSERT INTO blogs (userID, title, stylesheet) VALUES (?, ?, ?)", [req.user.id, req.body.title, ""]);;

      if (req.blogs.length === 0) {
        await database.query("UPDATE sessions SET selectedBlogID = ? WHERE uuid = ?", [newBlog[0].insertId, req.token.uuid])
      }

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
  console.log(req.token.uuid);
  if (!req.authed) {
    res.status(401).send("UNAUTH")
    return;
  }

  res.set("HX-Refresh", true);

  try {
    let [requestedBlog] = await database.query("SELECT * FROM blogs WHERE id = ?", [req.body.blog]);
    requestedBlog = requestedBlog[0]

    if (requestedBlog.userID !== req.user.id) {
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

router.post("/delete/:id", async (req, res) => {
  if (!req.authed) {
    res.status(401).send("UNAUTH");
    return;
  }

  res.set("HX-Refresh", true)

  try {
    let [ownsBlog] = await database.query("SELECT id FROM blogs WHERE id = ? AND userID = ?", [req.params.id, req.user.id])

    if (ownsBlog.length === 0) {
      res.status(401).send("UNAUTH");
      return;
    }

    await database.query("DELETE FROM blogs WHERE id = ?", [req.params.id])

    res.send("<div id='#delete-result' class='success'>Deleted!</div>")
  } catch (error) {
    console.error(error);
    res.send("<div id='delete-result' class='error'> ")
  }
})

module.exports = router;
