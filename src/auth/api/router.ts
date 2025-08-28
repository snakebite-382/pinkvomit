import express from 'express';
const router = express.Router();
import database from '../../database'
import argon from 'argon2'
import { getSessionCookieSettings, login, protect } from '../middleware';
import { User, IsAuthedRequest } from '../../types';
import { userValidator } from 'src/validation';

router.post("/validate/email", async (req, res) => {
  const { error } = userValidator.validate({ email: req.body.email })
  if (error == undefined) {
    try {
      let [rows] = await database.query("SELECT email FROM users WHERE email = ?", [req.body.email]) as [User[], any];
      if (rows.length !== 0) {
        res.send("<div id='email-result' class='error'>Email already in use</div>");
      } else {
        res.send("<div id='email-result' class='success'></div>")
      }
    } catch (err) {
      req.logger.error(err)
      res.send("<div id='email-result' class='error'>SERVER ERROR</div>");
    }
  } else {
    res.send("<div id='email-result' class='error'>Please use a valid email</div>")
  }
})

router.post("/validate/password", (req, res) => {
  const { error } = userValidator.validate({ password: req.body.password })
  if (error == undefined) {
    res.send("<div id='password-result' class='success'></div>");
  } else {
    res.send(`<div id='password-result' class='error'>${error.message}</div>`)
  }
})

router.post("/signup", async (req, res) => {
  const { email, password, confirmPassword } = req.body;
  const invalidInputsError = "<div id='signup-result' class='error'>Some inputs are invalid</div>"

  const { value, error } = userValidator.validate({ email: email, password: password, confirm_password: confirmPassword })
  if (error == undefined) {
    try {
      const hashedPassword = await argon.hash(value.password);

      let [rows] = await database.query("SELECT email FROM users WHERE email = ?", [value.email]) as [User[], any];
      if (rows.length !== 0) {
        res.send(invalidInputsError);
        return
      }

      [rows] = await database.query("INSERT INTO users (email, emailVerified, password) VALUES (?, false, ?)", [value.email, hashedPassword]) as [User[], any]

      let [signedToken, _] = await login(value.email, value.password);

      if (signedToken) {
        res.cookie("sessionToken", signedToken, {
          maxAge: 2 * 60 * 60 * 1000,
          sameSite: true
        })

        res.set("HX-Redirect", "/")
        res.send("<div id='signup-result' class='success'>Account created!</div>")
      } else {
        throw new Error("THIS SHOULD NEVER HAPPEN")
      }
    } catch (err) {
      req.logger.error(err)
      res.send("<div id='signup-result' class='error'>SERVER ERROR</div>");
    }
  } else {
    req.logger.warn({})
    res.send(invalidInputsError);
  }
});

router.post("/login", async (req, res) => {
  if (req.authed) {
    res.send("<div id='login-result' class='success'>Already logged in!</div>");
    return;
  }

  const { email, password } = req.body;

  let signedToken, loggedIn, decodedToken

  try {
    [signedToken, decodedToken, loggedIn] = await login(email, password);
  } catch (err) {
    req.logger.error(err);
    res.send("<div id='login-result' class='error'>SERVER ERROR</div>");
    return
  }

  if (loggedIn) {
    res.cookie("sessionToken", signedToken, getSessionCookieSettings());

    res.set("HX-Redirect", "/")

    res.send("<div id='login-result' class='success'>Logged in!</div>");
  } else {
    res.send("<div id='login-result' class='error'>Password or email is incorrect</div>");
  }
});

router.delete("/logout", protect((req) => ({ allowNoSelectedBlog: true })), async (req, res) => {
  if (!IsAuthedRequest(req)) {
    res.sendStatus(500);
    return
  }
  res.set("HX-Redirect", "/")

  try {
    await database.query("DELETE FROM sessions WHERE id = ? AND userID = ?", [req.token.uuid, req.user.id])
  } catch (error) {
    req.logger.error(error);
    // dont return here so even if the database fails to delete the user can still be logged out by removing the cookie
  }

  res.clearCookie("sessionToken");
  res.sendStatus(200);
})

export default router
