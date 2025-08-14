const express = require('express');
const router = express.Router()

router.get('/login', (req, res) => {
  res.render("login", { title: "LOGIN" });
})

router.get('/signup', (req, res) => {
  res.render('signup', { title: "SIGNUP" });
})

module.exports = router;
