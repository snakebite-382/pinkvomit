const express = require("express");
const router = express.Router();
const database = require("../../database.js");
const argon = require("argon2");
const { login } = require("../middleware.js");

function validateEmail(email) {
  let parts = email.split("@");

  if (parts.length != 2) return false;

  let domain = parts[1].split(".");

  if (domain.length != 2) return false;

  if (domain[1].length < 2) return false; // the top level domain after the . is at least 2 fromCharCode();

  return true;
}

function validatePassword(password) {
  if (password.length < 10) return false
  const numbers = "1234567890";
  const capitals = "QWERTYUIOPASDFGHJKLZXCVBNM";

  let containsNumber = false

  for (let number in numbers) {
    if (password.includes(number)) containsNumber = true
  }

  let containsCapital = false

  for (let capital in capitals) {
    if (password.includes(capital)) containsCapital = true
  }

  return containsCapital && containsNumber;
}


router.post("/validate/email", async (req, res) => {
  if (validateEmail(req.body.email)) {
    try {
      let [rows] = await database.query("SELECT email FROM users WHERE email = ?", [req.body.email]);
      if (rows.length !== 0) {
        res.send("Email already in use");
      } else {
        res.send("")
      }
    } catch (err) {
    }
  } else {
    res.send("Please use a valid email")
  }
})

router.post("/validate/password", (req, res) => {
  if (validatePassword(req.body.password)) {
    res.send("");
  } else {
    res.send("Password must be at least 10 characters with at least 1 capital and 1 number")
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
      const invalidInputsError = "<div id='form-result' class='error'>Some inputs are invalid</div>"
      let [rows] = await database.query("SELECT email FROM users WHERE email = ?", [email]);
      if (rows.length !== 0) {
        res.send(invalidInputsError);
        return
      }

      [rows] = await database.query("INSERT INTO users (email, emailVerified, password) VALUES (?, false, ?)", [email, hashedPassword])

      let [signedToken, _] = await login(email, password);

      if (signedToken) {
        res.cookie("sessionToken", signedToken, {
          maxAge: 2 * 60 * 60 * 1000,
          sameSite: true
        })

        res.send("<div id='form-result' class='success'>Account created!</div>")
      } else {
        throw new Error("THIS SHOULD NEVER HAPPEN")
      }
    } catch (err) {
      console.error(err);
      res.send("<div id='form-result' class='error'>SERVER ERROR</div>");
    }
  } else {
    res.send("<div id='form-result' class='error'>Some inputs are invalid</div>");
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;


  let signedToken

  try {
    [signedToken] = await login(email, password);
  } catch (err) {
    console.error(err)
    res.send("<div id='form-result' class='error'>SERVER ERROR</div>");
    return
  }


  if ("sessionToken" in req.cookies) {
    res.send("<div id='form-result' class='success'>Already logged in!</div>");
    return;
  }

  if (signedToken) {
    res.cookie("sessionToken", signedToken, {
      maxAge: 2 * 60 * 60 * 1000,
      sameSite: true
    });

    res.send("<div id='form-result' class='success'>Logged in!</div>");
  } else {
    res.send("<div id='form-result' class='error'>Password or email is incorrect</div>");
  }
});

module.exports = router;
