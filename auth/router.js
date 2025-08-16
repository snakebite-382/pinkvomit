const express = require('express');
const router = express.Router()
const apiRouter = require("./api/router.js");

router.use("/api", apiRouter);

router.get('/login', (req, res) => {
  res.render("login", { title: "LOGIN" });
})

router.get('/signup', (req, res) => {
  res.render('signup', { title: "SIGNUP" });
})

module.exports = router;
