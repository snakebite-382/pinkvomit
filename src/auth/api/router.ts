import express from 'express';
const router = express.Router();
import database from '../../database'
import argon from 'argon2'
import { getSessionCookieSettings, login, protect } from '../middleware';
import { User, IsAuthedRequest } from '../../types';

function validateEmail(email: string) {
  let parts = email.split("@");

  if (email.includes(" ")) return false;

  if (parts.length != 2) return false;

  let domain = parts[1].split(".");

  if (domain.length != 2) return false;

  if (domain[1].length < 2) return false; // the top level domain after the . is at least 2 fromCharCode();

  return true;
}


function validatePassword(password: string) {
  if (password.length < 10) return false
  const numbers: any = "1234567890";
  const capitals: any = "QWERTYUIOPASDFGHJKLZXCVBNM";

  let containsNumber = false

  for (let char of numbers) {
    if (password.includes(char)) containsNumber = true
  }

  let containsCapital = false

  for (let capital of capitals) {
    if (password.includes(capital)) containsCapital = true
  }

  return containsCapital && containsNumber;
}


router.post("/validate/email", async (req, res) => {
  if (validateEmail(req.body.email)) {
    try {
      let [rows] = await database.query("SELECT email FROM users WHERE email = ?", [req.body.email]) as [User[], any];
      if (rows.length !== 0) {
        res.send("<div id='email-result' class='error'>Email already in use</div>");
      } else {
        res.send("<div id='email-result' class='success'></div>")
      }
    } catch (err) {
      console.error(err);
      res.send("<div id='email-result' class='error'>SERVER ERROR</div>");
    }
  } else {
    res.send("<div id='email-result' class='error'>Please use a valid email</div>")
  }
})

router.post("/validate/password", (req, res) => {
  if (validatePassword(req.body.password)) {
    res.send("<div id='password-result' class='success'></div>");
  } else {
    res.send("<div id='password-result' class='error'>Password must be at least 10 characters with at least 1 capital and 1 number</div>")
  }
})

router.post("/signup", async (req, res) => {
  const { email, password, confirmPassword } = req.body;

  if (
    validateEmail(email) &&
    validatePassword(password) &&
    password.localeCompare(confirmPassword) === 0
  ) {
    try {
      const hashedPassword = await argon.hash(password);
      const invalidInputsError = "<div id='signup-result' class='error'>Some inputs are invalid</div>"
      let [rows] = await database.query("SELECT email FROM users WHERE email = ?", [email]) as [User[], any];
      if (rows.length !== 0) {
        res.send(invalidInputsError);
        return
      }

      [rows] = await database.query("INSERT INTO users (email, emailVerified, password) VALUES (?, false, ?)", [email, hashedPassword]) as [User[], any]

      let [signedToken, _] = await login(email, password);

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
      console.error(err);
      res.send("<div id='signup-result' class='error'>SERVER ERROR</div>");
    }
  } else {
    console.log(`email: ${validateEmail(email)}, password: ${validatePassword(password)}, confirm: ${password.localeCompare(confirmPassword) === 0}`)
    res.send("<div id='signup-result' class='error'>Some inputs are invalid</div>");
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
    console.error(err)
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
    await database.query("DELETE FROM sessions WHERE uuid = ? AND userID = ?", [req.token.uuid, req.user.id])
  } catch (error) {
    console.error(error);
  }

  res.clearCookie("sessionToken");
  res.sendStatus(200);
})

export default router
