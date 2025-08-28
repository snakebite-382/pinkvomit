import crypto from 'crypto'
import argon from 'argon2';
import signer from './jwt';
import database from '../database';
import { Blog, DecodedJWT, GetProtectOptions, IsAuthedRequest, Session, User } from '../types';
import { NextFunction, Request, Response } from 'express';

function getSessionToken(email: string): DecodedJWT {
  return {
    email: email,
    uuid: crypto.randomUUID(),
    exp: Date.now() + (2 * 60 * 60 * 1000),
    iat: Date.now()
  }
}

export function getSessionCookieSettings() {
  return {
    maxAge: 2 * 60 * 60 * 1000,
    sameSite: true,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  }
}

export async function getUserByEmail(email: string): Promise<User> {
  const [rows] = await database.query("SELECT * FROM users WHERE email = ?", [email]) as [User[], any];
  return rows[0];
};

export async function login(email: string, password: string): Promise<[null, null, false] | [string, DecodedJWT, true]> {
  let user = await getUserByEmail(email);

  if (user === undefined) {
    // invalid email
    return [null, null, false];
  }

  let validPassword = await argon.verify(user.password, password)

  if (validPassword) {
    let token = getSessionToken(user.email);

    let signedToken = signer.sign(token);

    await database.query("INSERT INTO sessions (id, userID, expiresAt, selectedBlogID) VALUES (?, ?, ?, ?)", [token.uuid, user.id, token.exp, user.mainBlogID])

    return [signedToken, token, true];
  }

  return [null, null, false];
}

// Middleware:

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
    req.logger.error(err)
    req.authed = false;
    req.token = null;
    return next();
  }

  try {

    let [rows] = await database.query("SELECT id FROM sessions WHERE id = ?", [verifiedToken.uuid]) as [Session[], any];

    if (rows.length === 0) {
      req.authed = false;
      req.token = null;
      return next();
    }
  } catch (err) {
    req.logger.error(err)
    req.authed = false;
    req.token = null;
    return next();
  }

  req.authed = true;
  req.token = verifiedToken;

  return next();
}

export async function keepAlive(req: Request, res: Response, next: NextFunction) {
  if (!IsAuthedRequest(req)) {
    next();
    return;
  }

  let decodedToken = signer.decode(req.cookies.sessionToken);

  if (Date.now() + (15 * 60 * 1000) >= decodedToken.exp) { // if will token be expired in 15 minutes
    try {
      let user = await getUserByEmail(decodedToken.email);

      let token = getSessionToken(user.email);

      let signedToken = signer.sign(token)

      res.cookie("sessionToken", signedToken, getSessionCookieSettings())

      const [selectedBlog] = await database.query("SELECT selectedBlogID FROM sessions WHERE id = ?", [decodedToken.uuid]) as [Session[], any];

      await database.query("DELETE FROM sessions WHERE id = ?", [decodedToken.uuid]);

      await database.query("INSERT INTO sessions (id, userID, expiresAt, selectedBlogID) VALUES (?, ?, ?, ?)", [token.uuid, user.id, token.exp, selectedBlog[0].selectedBlogID])

      req.logger = req.logger.child({
        token: token,
      })
    } catch (error) {
      req.logger.error(error)
      next();
    }
  }
  next()
}

export async function fetchUser(req: Request, res: Response, next: NextFunction) {
  if (!req.authed || req.token == null || !('token' in req)) {
    req.user = null;
    req.blogs = [];
    req.selectedBlog = undefined;
    next();
    return;
  }

  try {
    req.user = await getUserByEmail(req.token.email) as User;
    const [blogs] = await database.query("SELECT * FROM blogs WHERE userID = ?", [req.user.id]) as [Blog[], any];

    let [sessions] = await database.query("SELECT selectedBlogID FROM sessions WHERE id = ?", [req.token.uuid]) as [Session[], any];

    const [selectedBlogs] = await database.query("SELECT * FROM blogs WHERE id = ?", [sessions[0].selectedBlogID]) as [Blog[], any];

    req.blogs = blogs;
    req.selectedBlog = selectedBlogs.length !== 0 ? selectedBlogs[0] : undefined;

    next();
  } catch (error) {
    req.logger.error(error)
    next();
  }
}

export function protect(getOptions: GetProtectOptions = (req: Request) => ({})) {
  return async function(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (req.user == null || !req.authed) {
      req.logger.warn({}, "Protect failed: not logged in");
      res.sendStatus(401);
      return;
    }

    const options = getOptions(req);
    const logger = req.logger.child({
      protectOptions: options
    })
    const { ownsBlog, allowNoSelectedBlog } = options;

    if (allowNoSelectedBlog) {
      if (!options.allowNoSelectedBlog && req.selectedBlog == null) { // if allowNoSelectedBlog is explicitly false for some reason
        res.sendStatus(401);
        logger.warn({}, "Protect failed: no selected blog")
        return;
      }
    } else if (req.selectedBlog == null) { // otherwise check selectedBlog by default
      res.sendStatus(401);
      logger.warn({}, "Protect failed: no selected blog")
      return;
    }


    if (ownsBlog) {
      let ownsBlogQuery
      if ("id" in ownsBlog) {
        if ("title" in ownsBlog) {
          [ownsBlogQuery] = await database.query("SELECT id FROM blogs WHERE id = ? AND BINARY title = ? AND userID = ?", [ownsBlog.id, ownsBlog.title, req.user.id]) as [Blog[], any];
        } else {
          [ownsBlogQuery] = await database.query("SELECT id FROM blogs WHERE id = ? AND userID = ?", [ownsBlog.id, req.user.id]) as [Blog[], any];
        }
      } else {
        [ownsBlogQuery] = await database.query("SELECT title FROM blogs WHERE BINARY title = ? and userID = ?", [ownsBlog.title, req.user.id]) as [Blog[], any];
      }
      if (ownsBlogQuery.length === 0) {
        res.sendStatus(401);
        logger.warn({}, "Protect failed: user does not own blog");
        return;
      }
    }

    next();
  }
}
