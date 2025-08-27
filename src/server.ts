// This is the server entrypoint
// the only things in this file should be setting up and running the server
import dotenv from 'dotenv';
dotenv.config();
import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';

import { keepAlive, authenticate, fetchUser } from './auth/middleware';
import render from './templating';

import postsRouter from './posts/router';
import authRouter from './auth/router';
import blogsRouter from './blogs/router';
import pagesRouter from "./pages/router";
import { AuthedRequest } from 'types';
import path from 'path';
import crypto from 'crypto'

const app = express();
const port = 3000;

app.use(cookieParser());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  ipv6Subnet: 56
}));

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "script-src": [
          "'self'",
          "https://cdn.jsdelivr.net",
        ],
        "connect-src": ["'self'"]
      },
    },
  })
);

// If you need access to the nonce in your templates, 
// you can extract it from the CSP header
app.use((req: Request, res: Response, next: NextFunction) => {
  const cspHeader = res.getHeader('Content-Security-Policy') as string;
  const nonceMatch = cspHeader?.match(/'nonce-([^']+)'/);
  if (nonceMatch) {
    res.locals.nonce = nonceMatch[1];
  }
  next();
});

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
