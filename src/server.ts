// This is the server entrypoint
// the only things in this file should be setting up and running the server
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cookieParser from 'cookie-parser';

import { keepAlive, authenticate, fetchUser } from './auth/middleware';
import render from './templating';

import postsRouter from './posts/router';
import authRouter from './auth/router';
import blogsRouter from './blogs/router';
import pagesRouter from "./pages/router";
import { AuthedRequest } from 'types';
import path from 'path';

const app = express();
const port = 3000;

app.use(cookieParser());

app.use(express.json({
  type: ['application/json', 'text/json']
}));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(authenticate);
app.use(fetchUser);
app.use(keepAlive);

// basic example of how to render a page using the homepage.
// other pages should have their own router 
app.get('/', (req, res) => {
  render(req as AuthedRequest, res, "index", "HOME");
})

app.use('/auth', authRouter);

app.use('/blogs', blogsRouter);

app.use("/posts", postsRouter);

app.use("/pages", pagesRouter)

app.listen(port, () => {
  console.log(`listening on port ${port}`);
})
