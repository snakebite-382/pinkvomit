// This is the server entrypoint
// the only things in this file should be setting up and running the server
const express = require('express');
const app = express();
const port = 3000;
require('dotenv').config();

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

console.log(process.env.database)

// example of how to use the connection object to connect, run a query, then disconnect
app.get('/testdb', (req, res) => {
  const database = require('./database.js');

  database.connect();

  database.query('SELECT 1 + 1 AS solution', (err, rows, fields) => {
    if (err) throw err

    console.log('The solution is: ', rows[0].solution);
    res.send("Working!")
  })

  database.end();
})
app.listen(port, () => {
  console.log(`listening on port ${port}`);
})
