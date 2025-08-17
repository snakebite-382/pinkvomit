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
        req.token = false;
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

  keepAlive: async (req, _, next) => {
    if (!("sessionToken" in req.cookies)) {
      return next();
    }

    let decodedToken = signer.decode(req.cookies.sessionToken);

    if (Date.now() >= decodedToken.exp + 15 * 60 * 1000) { // if will token be expired in 15 minutes
      try {
        let user = await getUserByEmail(decodedToken.email);


        let token = {
          email: user.email,
          uuid: crypto.randomUUID(),
          exp: Date.now() + (2 * 60 * 60 * 1000)
        };

        let signedToken = await signer.sign(token)

        res.cookie("sessionToken", signedToken, {
          maxAge: 2 * 60 * 60 * 1000,
          sameSite: true,
        })

        await database.query("DELETE FROM sessions WHERE uuid = ?", [decodedToken.uuid]);

        await database.query("INSERT INTO sessions (uuid, userID, expiresAt) VALUES (?, ?, ?)", [token.uuid, user.id, token.exp])
      } catch (error) {
        console.error(error)
        return next();
      }
    }

    next()
  },


  login: async (email, password) => {
    let user = await getUserByEmail(email);
    let validPassword = await argon.verify(user.password, password)

    if (validPassword) {
      let token = {
        email: user.email,
        uuid: crypto.randomUUID(),
        exp: Date.now() + (2 * 60 * 60 * 1000) // set to expire in 2 hours
      };

      let signedToken = signer.sign(token);

      await database.query("INSERT INTO sessions (uuid, userID, expiresAt) VALUES (?, ?, ?)", [token.uuid, user.id, token.exp])

      return [signedToken, token];
    }

    return [null, null];
  },

  getUserByEmail: getUserByEmail,
}
