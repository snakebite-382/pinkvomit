const crypto = require('crypto');
const argon = require('argon2')
const signer = require('./jwt.js');
const database = require('../database.js');

async function getUserByEmail(email) {
  let [rows] = await database.query("SELECT * FROM users WHERE email = ?", [email]);
  return rows[0];
};

module.exports = {
  authenticate: async (req, _, next) => {
    if (!("sessionToken" in req.cookies)) {
      req.authed = false;
      req.token = null;
      return next();
    }

    let verifiedToken

    try {
      verifiedToken = signer.verify(req.cookies.sessionToken);
    } catch (err) {
      console.error(err);
      req.authed = false;
      req.token = null;
      return next();
    }

    try {
      let [rows] = await database.query("SELECT uuid FROM sessions WHERE uuid = ?", [verifiedToken.uuid])

      if (rows.length === 0) {
        req.authed = false;
        req.token = null;
        return next();
      }
    } catch (err) {
      console.error(err);
      req.authed = false;
      req.token = null;
      return next();
    }

    req.authed = true;
    req.token = verifiedToken;

    next();
  },

  keepAlive: async (req, res, next) => {
    if (!("sessionToken" in req.cookies)) {
      return next();
    }

    let decodedToken = signer.decode(req.cookies.sessionToken);

    if (Date.now() + (15 * 60 * 1000) >= decodedToken.exp) { // if will token be expired in 15 minutes
      try {
        let user = await getUserByEmail(decodedToken.email);


        let token = {
          email: user.email,
          uuid: crypto.randomUUID(),
          exp: Date.now() + (2 * 60 * 60 * 1000)
        };

        let signedToken = signer.sign(token)

        res.cookie("sessionToken", signedToken, {
          maxAge: 2 * 60 * 60 * 1000,
          sameSite: true,
        })

        const [selectedBlog] = await database.query("SELECT selectedBlogID FROM sessions WHERE uuid = ?", [decodedToken.uuid]);

        await database.query("DELETE FROM sessions WHERE uuid = ?", [decodedToken.uuid]);

        await database.query("INSERT INTO sessions (uuid, userID, expiresAt, selectedBlogID) VALUES (?, ?, ?, ?)", [token.uuid, user.id, token.exp, selectedBlog[0].selectedBlogID])
      } catch (error) {
        console.error(error)
        return next();
      }
    }

    next()
  },

  fetchUser: async (req, _, next) => {
    if (!req.authed) {
      req.user = null;
      req.blogs = [];
      req.selectedBlog = null;
      return next();
    }

    try {
      req.user = await getUserByEmail(req.token.email);
      const [blogs] = await database.query("SELECT * FROM blogs WHERE userID = ?", [req.user.id]);

      let [sessions] = await database.query("SELECT selectedBlogID FROM sessions WHERE uuid = ?", [req.token.uuid]);

      const [selectedBlogs] = await database.query("SELECT * FROM blogs WHERE id = ?", [sessions[0].selectedBlogID]);

      req.blogs = blogs;
      req.selectedBlog = selectedBlogs[0];

      return next();
    } catch (error) {
      console.error(error);
      return next();
    }
  },

  login: async (email, password) => {
    let user = await getUserByEmail(email);

    if (user === undefined) {
      // invalid email
      return [null, null, false];
    }

    let validPassword = await argon.verify(user.password, password)

    if (validPassword) {
      let token = {
        email: user.email,
        uuid: crypto.randomUUID(),
        exp: Date.now() + (2 * 60 * 60 * 1000) // set to expire in 2 hours
      };

      let signedToken = signer.sign(token);

      await database.query("INSERT INTO sessions (uuid, userID, expiresAt, selectedBlogID) VALUES (?, ?, ?, ?)", [token.uuid, user.id, token.exp, user.mainBlogID])

      return [signedToken, token, true];
    }

    return [null, null, false];
  },

  // returns a valid middleware function using the given options
  // ownsBlog: checks if the user owns the blog, if id is present checks that, otherwise checks by title
  protect: (getOption = () => { }) => {
    return async (req, res, next) => {
      console.log("MIDDLEWARE")
      if (req.user == null || req.selectedBlog == null || !req.authed) {
        res.sendStatus(401);
        return;
      }

      const options = getOptions(req);

      if ("ownsBlog" in options) {
        let ownsBlog
        if ("id" in options.ownsBlog) {
          [ownsBlog] = await database.query("SELECT id FROM blogs WHERE id = ? AND userID = ?", [options.ownsBlog.id, req.user.id]);
        } else {
          [ownsBlog] = await database.query("SELECT title FROM blogs WHERE title = ? and userID = ?", [options.ownsBlog.title, req.user.id]);
        }

        if (ownsBlog.length === 0) {
          res.sendStatus(401);
          return;
        }
      }

      // if all checks pass;
      return next();
    }
  },

  getUserByEmail: getUserByEmail,
}
