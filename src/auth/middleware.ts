import crypto from 'crypto'
import argon from 'argon2';
import signer from './jwt';
import database from '../database';
import { Blog, DecodedJWT, GetProtectOptions, Session, User } from '../types';
import { NextFunction, Request, Response } from 'express';

export async function getUserByEmail(email: string): Promise<User> {
  const [rows] = await database.query("SELECT * FROM users WHERE email = ?", [email]) as [User[], any];
  return rows[0];
};

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  if (!("sessionToken" in req.cookies)) {
    req.authed = false;
    req.token = null;
    return next();
  }

  let verifiedToken

  try {
    verifiedToken = signer.verify(req.cookies.sessionToken);

    if (typeof verifiedToken == "string") {
      req.authed = false;
      req.token = null;
      return;
    }
  } catch (err) {
    console.error(err);
    req.authed = false;
    req.token = null;
    return next();
  }

  try {

    let [rows] = await database.query("SELECT uuid FROM sessions WHERE uuid = ?", [verifiedToken.uuid]) as [Session[], any];

    if (rows.length === 0) {
      req.authed = false;
      req.token = null;
      return next();
    }
  } catch (err) {
    console.error(err);
    req.authed = false;
    req.token = null;
    return next();
  }

  req.authed = true;
  req.token = verifiedToken;

  return next();
}

export async function keepAlive(req: Request, res: Response, next: NextFunction) {
  if (!req.authed) {
    return next();
  }

  let decodedToken = signer.decode(req.cookies.sessionToken);

  if (Date.now() + (15 * 60 * 1000) >= decodedToken.exp) { // if will token be expired in 15 minutes
    try {
      let user = await getUserByEmail(decodedToken.email);


      let token = {
        email: user.email,
        uuid: crypto.randomUUID(),
        exp: Date.now() + (2 * 60 * 60 * 1000),
        iat: Date.now()
      };

      let signedToken = signer.sign(token)

      res.cookie("sessionToken", signedToken, {
        maxAge: 2 * 60 * 60 * 1000,
        sameSite: true,
      })

      const [selectedBlog] = await database.query("SELECT selectedBlogID FROM sessions WHERE uuid = ?", [decodedToken.uuid]) as [Session[], any];

      await database.query("DELETE FROM sessions WHERE uuid = ?", [decodedToken.uuid]);

      await database.query("INSERT INTO sessions (uuid, userID, expiresAt, selectedBlogID) VALUES (?, ?, ?, ?)", [token.uuid, user.id, token.exp, selectedBlog[0].selectedBlogID])
    } catch (error) {
      console.error(error)
      return next();
    }
  }

  next()
}

export async function fetchUser(req: Request, res: Response, next: NextFunction) {
  if (!req.authed || req.token == null || !('token' in req)) {
    req.user = null;
    req.blogs = [];
    req.selectedBlog = null;
    next();
    return;
  }

  try {
    req.user = await getUserByEmail(req.token.email) as User;
    const [blogs] = await database.query("SELECT * FROM blogs WHERE userID = ?", [req.user.id]) as [Blog[], any];

    let [sessions] = await database.query("SELECT selectedBlogID FROM sessions WHERE uuid = ?", [req.token.uuid]) as [Session[], any];

    const [selectedBlogs] = await database.query("SELECT * FROM blogs WHERE id = ?", [sessions[0].selectedBlogID]) as [Blog[], any];

    req.blogs = blogs;
    req.selectedBlog = selectedBlogs[0];

    next();
  } catch (error) {
    console.error(error);
    next();
  }
}

export async function login(email: string, password: string): Promise<[null, null, false] | [string, DecodedJWT, true]> {
  let user = await getUserByEmail(email);

  if (user === undefined) {
    // invalid email
    return [null, null, false];
  }

  let validPassword = await argon.verify(user.password, password)

  if (validPassword) {
    let token = {
      email: user.email,
      uuid: crypto.randomUUID(),
      exp: Date.now() + (2 * 60 * 60 * 1000), // set to expire in 2 hours
      iat: Date.now()
    };

    let signedToken = signer.sign(token);

    await database.query("INSERT INTO sessions (uuid, userID, expiresAt, selectedBlogID) VALUES (?, ?, ?, ?)", [token.uuid, user.id, token.exp, user.mainBlogID])

    return [signedToken, token, true];
  }

  return [null, null, false];
}

export function protect(getOptions: GetProtectOptions = (req: Request) => ({})) {
  return async function(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (req.user == null || !req.authed) {
      res.sendStatus(401);
      console.log("LOGGED OUT")
      return;
    }

    const options = getOptions(req);
    const { ownsBlog, allowNoSelectedBlog } = options;

    if (allowNoSelectedBlog) {
      if (!options.allowNoSelectedBlog && req.selectedBlog == null) { // if allowNoSelectedBlog is explicitly false for some reason
        res.sendStatus(401);
        console.log("NO SELECTED BLOG")
        return;
      }
    } else if (req.selectedBlog == null) { // otherwise check selectedBlog by default
      res.sendStatus(401);
      console.log("NO SELECTED BLOG")
      return;
    }


    if (ownsBlog) {
      let ownsBlogQuery
      if ("id" in ownsBlog) {
        [ownsBlogQuery] = await database.query("SELECT id FROM blogs WHERE id = ? AND userID = ?", [ownsBlog.id, req.user.id]) as [Blog[], any];
      } else {
        [ownsBlogQuery] = await database.query("SELECT title FROM blogs WHERE title = ? and userID = ?", [ownsBlog.title, req.user.id]) as [Blog[], any];
      }
      if (ownsBlogQuery.length === 0) {
        res.sendStatus(401);
        console.log("DOES NOT OWN BLOG")
        return;
      }
    }

    // if all checks pass;
    next();
  }
}
