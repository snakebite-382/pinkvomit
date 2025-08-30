import signer from './jwt';
import { DecodedJWT, DecodedRefreshJWT, GetProtectOptions, ID, IsAuthedRequest, IsDecodedJWT, Session, User } from '../types';
import { NextFunction, Request, Response } from 'express';
import { SessionService, UserService } from './service';
import { SessionRepository, UserRepository } from './repository';
import { BlogRepository } from 'src/blogs/repository';
import { BlogService } from 'src/blogs/service';
import { PageRepository } from 'src/pages/repository';
import { TokenExpiredError } from 'jsonwebtoken';

export function getRefeshToken(id: ID): DecodedRefreshJWT {
  let expires = new Date();
  expires.setDate(expires.getTime() + maxRefreshAge);
  return {
    refreshes: id,
    exp: expires
  }
}

export function getSessionExpiry(): Date {
  const expires = new Date();
  expires.setDate(expires.getTime() + maxSessionAge);
  return expires;
}

export function getSessionCookieSettings() {
  return {
    maxAge: maxSessionAge,
    sameSite: true,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  }
}

export function getRefeshCookieSettings() {
  return {
    maxAge: maxRefreshAge,
    sameSite: true,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  }
}

export function getTokensFromSession(session: Session): { sessionToken: DecodedJWT, refreshToken: DecodedRefreshJWT } {
  const sessionToken: DecodedJWT = {
    uuid: session.id,
    exp: session.expiresAt,
    iat: session["created_at"]
  }

  const refreshToken: DecodedRefreshJWT = getRefeshToken(session.id);

  return { sessionToken, refreshToken };
}

export const maxSessionAge = 15 * 60 * 1000;
export const maxRefreshAge = 24 * 60 * 60 * 1000;

// Middleware:

export class AuthMiddleware {
  static async tryRefresh(req: Request, res: Response, next: NextFunction) {
    try {
      if ("sessionToken" in req.cookies && req.cookies.sessionToken !== undefined && req.cookies.sessionToken !== null) {
        try {
          const sessionToken = signer.verify<DecodedJWT>(req.cookies.sessionToken);
          if (typeof sessionToken !== "string") {
            next();
            return;
          }
        } catch (error) {
          if (!(error instanceof TokenExpiredError)) {
            throw error;
          }
        }
      }

      if ("refreshToken" in req.cookies && req.cookies.refreshToken !== undefined && req.cookies.sessionToken !== null) {
        const sessionService = new SessionService(new SessionRepository(), new UserRepository(), new BlogRepository());

        const refreshToken = signer.verify<DecodedRefreshJWT>(req.cookies.refreshToken);
        if (typeof refreshToken === "string") {
          next();
          return;
        }

        const session = await sessionService.getSession(refreshToken.refreshes);

        if (session === null) {
          res.clearCookie("refreshToken");
          throw new Error("Session invalidated");
        }

        const newSession = await sessionService.rotate(session.id, session.userID, getSessionExpiry());

        const { sessionToken, refreshToken: newRefreshToken } = getTokensFromSession(newSession);

        const signedSessionToken = signer.sign(sessionToken);
        const signedRefreshToken = signer.sign(newRefreshToken);

        res.clearCookie("refreshToken");
        res.clearCookie("sessionToken");
        res.cookie("sessionToken", signedSessionToken, getSessionCookieSettings());
        res.cookie("refreshToken", signedRefreshToken, getRefeshCookieSettings());
      }
    } catch (error) {
      req.logger.error(error);
      next();
      return;
    }
  }

  static async authenticate(req: Request, res: Response, next: NextFunction) {
    if (!("sessionToken" in req.cookies)) {
      req.authed = false;
      req.token = null;
      next();
      return;
    }

    try {
      const verifiedToken = signer.verify<DecodedJWT>(req.cookies.sessionToken);

      if (typeof verifiedToken === "string") {
        throw new Error("Invalid token");
      }

      if (!IsDecodedJWT(verifiedToken)) {
        throw new Error("Invalid token");
      }

      const sessionService = new SessionService(new SessionRepository(), new UserRepository(), new BlogRepository());
      const session = sessionService.getSession(verifiedToken.uuid);

      if (session === null) {
        throw new Error("Session does not exist");
      }
    } catch (error) {
      req.logger.error(error);
      req.authed = false;
      req.token = null;
      next();
    }
  }

  static async fetchUser(req: Request, res: Response, next: NextFunction) {
    if (!req.authed || req.token === null || req.token === undefined) {
      req.user = null;
      req.blogs = [];
      req.selectedBlog = undefined;
      next();
      return;
    }

    try {
      const userService = new UserService(new UserRepository(), new BlogRepository());
      const blogService = new BlogService(new BlogRepository(), new PageRepository(), new UserRepository());
      const sessionService = new SessionService(new SessionRepository(), new UserRepository(), new BlogRepository());

      const session = await sessionService.getSession(req.token.uuid);
      if (session === null) {
        throw new Error("Session does not exist");
      }

      const currentUser = await userService.getUserByID(session.userID);
      if (currentUser === null) {
        throw new Error("User does not exist");
      }
      req.user = currentUser;

      if (session.selectedBlogID !== null) {
        const selectedBlog = await blogService.getBlogByID(session.selectedBlogID);
        if (selectedBlog === null) throw new Error("Selected blog does not exist")

        req.selectedBlog = { id: selectedBlog.id, title: selectedBlog.title, userID: currentUser.id }

        const blogs = await blogService.getBlogsByUser(currentUser.id) || [];
        req.blogs = blogs.map(blog => ({ id: blog.id, title: blog.title, userID: currentUser.id }));
      }
      next();
    } catch (error) {
      req.logger.error(error);
      res.sendStatus(500);
    }
  }

  static protect(getOptions: GetProtectOptions = (req: Request) => ({})) {
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

      try {
        if (ownsBlog) {
          const blogService = new BlogService(new BlogRepository(), new PageRepository(), new UserRepository());
          if (ownsBlog.id !== undefined && ownsBlog.title !== undefined) {
            const blog = await blogService.getBlogByTitle(ownsBlog.title);
            if (blog === null) {
              throw new Error("Blog does not exist");
            }
            if (blog.id != ownsBlog.id || blog.userID != req.user.id) {
              throw new Error("User does not own blog");
            }
          } else if (ownsBlog.id !== undefined) {
            const owner = await blogService.userOwnsBlog(ownsBlog.id, req.user.id);
            if (!owner) {
              throw new Error("User does not own blog");
            }
          } else if (ownsBlog.title !== undefined) {
            const owner = await blogService.userOwnsBlogTitle(ownsBlog.title, req.user.id);
            if (!owner) {
              throw new Error("User does not own blog");
            }
          }
        }
      } catch (error) {
        res.sendStatus(401);
        logger.warn({}, "Protect failed: does not own blog");
        logger.error(error);
        return;
      }

      next();
    }
  }
}
