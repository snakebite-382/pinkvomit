// This is the server entrypoint
// the only things in this file should be setting up and running the server
const express = require('express');

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const { keepAlive, authenticate, fetchUser } = require('./auth/middleware.js');

const render = require('./templating.js');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded());
app.use(cookieParser());

app.use(express.static("public"));

app.set('view engine', 'ejs');
app.set('views', './views');

app.use(keepAlive);
app.use(authenticate);
app.use(fetchUser);

// basic example of how to render a page using the homepage.
// other pages should have their own router 
app.get('/', (req, res) => {
  render(req, res, "index", "HOME");
})

const authRouter = require('./auth/router.js');
app.use('/auth', authRouter);

const blogsRouter = require('./blogs/router.js');
app.use('/blogs', blogsRouter);

app.listen(port, () => {
  console.log(`listening on port ${port}`);
})
