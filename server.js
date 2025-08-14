// This is the server entrypoint
// the only things in this file should be setting up and running the server
const express = require('express');
const app = express();
const port = 3000;

app.use(express.static("public"));

app.set('view engine', 'ejs');
app.set('views', './views');

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
