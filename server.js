// This is the server entrypoint
// the only things in this file should be setting up and running the server
const express = require('express');

require('dotenv').config();

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const database = require('./database.js');
const { keepAlive } = require('./auth/middleware.js');

const app = express();
const port = 3000;


console.log(process.env.databaseuser)

app.use(bodyParser.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(express.static("public"));

app.set('view engine', 'ejs');
app.set('views', './views');

app.use(keepAlive)

// basic example of how to render a page using the homepage.
// other pages should have their own router 
app.get('/', (req, res) => {
  res.render('index', { title: "HOME" });
})

const authRouter = require('./auth/router.js');
app.use('/auth', authRouter);

app.listen(port, () => {
  console.log(`listening on port ${port}`);
})
