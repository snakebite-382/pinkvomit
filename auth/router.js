// this route is for everything related to authentication
// it features authentication middleware, and api endpoints for managing sessions 
const express = require('express');
const router = express.Router()
const apiRouter = require("./api/router.js");
const render = require('../templating.js');

router.use("/api", apiRouter);

router.get('/login', (req, res) => {
  render(req, res, "auth/login", "LOGIN");
})

router.get('/signup', (req, res) => {
  render(req, res, "auth/signup", "SIGNUP");
})

module.exports = router;
