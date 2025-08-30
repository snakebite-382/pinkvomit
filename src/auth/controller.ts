import { NextFunction, Request, Response } from "express";
import { sanitizeInput, userValidator } from "../validation";
import { SessionService, UserService } from "./service";
import { UserRepository, SessionRepository } from "./repository";
import { BlogRepository } from "src/blogs/repository";
import { resultMessage, unsafeCheckValidation, ValidationOptions } from "src/controller";
import argon from 'argon2';
import { getRefeshCookieSettings, getRefeshToken, getSessionCookieSettings, getSessionExpiry, getTokensFromSession } from "./middleware";
import { DecodedJWT, DecodedRefreshJWT, IsAuthedRequest } from "types";
import signer from "./jwt";

export class AuthController {
  static validateEmail(options: ValidationOptions) {
    const { swapOutOfBounds = false, alwaysCallNext = false, validateUnique = true } = options;
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const sanitizedEmail = sanitizeInput(req.body.email)
        const { value, error } = userValidator.validate({ email: sanitizedEmail })

        if (error !== undefined) {
          if (alwaysCallNext) {
            next();
            return;
          }
          res.send(resultMessage(error.message, "email", swapOutOfBounds));
          return;
        }

        if (validateUnique) {
          const userService = new UserService(new UserRepository(), new BlogRepository());
          const emailInUse = await userService.emailInUse(value.email);

          if (emailInUse) {
            if (alwaysCallNext) {
              next();
              return;
            }
            res.send(resultMessage("Email already in use", "email", swapOutOfBounds))
            return;
          }
        }

        req.body.email = {
          value: value.email,
          validated: true
        }
        next();
      } catch (error) {
        req.logger.error(error);
        res.send(resultMessage("There was a server error while validating your email", "email", swapOutOfBounds))
      }
    }
  }

  static validatePassword(options: ValidationOptions) {
    const { swapOutOfBounds = false, alwaysCallNext = false } = options;
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const sanitizedPassword = sanitizeInput(req.body.password)
        const { value, error } = userValidator.validate({ password: sanitizedPassword });

        if (error !== undefined) {
          if (alwaysCallNext) {
            next();
            return;
          }
          res.send(resultMessage(error.message, "password", swapOutOfBounds))
          return;
        }

        req.body.password = {
          value: value.password,
          validated: true
        }

        next();
      } catch (error) {
        req.logger.error(error)
        if (alwaysCallNext) {
          next();
          return;
        }
        res.send(resultMessage("There was a server error while validating your password", "password", swapOutOfBounds))
      }
    }
  }

  static signup(req: Request, res: Response, next: NextFunction) {
    try {
      const email = unsafeCheckValidation<string>(req.body.email);
      const password = unsafeCheckValidation<string>(req.body.password)

      const userService = new UserService(new UserRepository(), new BlogRepository());
      userService.createUser(email, password);

      next();
    } catch (error) {
      req.logger.error(error);
      res.send(resultMessage("There was a server error while signing you up", "signup", false))
    }
  }

  static login(sendValidationErrors = true) {
    const invalidMessage = resultMessage("Email or password is incorrect", "login", false);
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const email = unsafeCheckValidation<string>(req.body.email);
        const password = unsafeCheckValidation<string>(req.body.password);

        const sessionService = new SessionService(new SessionRepository(), new UserRepository(), new BlogRepository());
        const userService = new UserService(new UserRepository(), new BlogRepository());

        const user = await userService.getUser(email);

        if (user === null) {
          throw new Error("Invalid email")
        }

        if (!(await argon.verify(password, user.password))) {
          throw new Error("Invalid password")
        }

        const session = await sessionService.createSession(user.id, user.mainBlogID, getSessionExpiry());

        if (session === null) {
          throw new Error("Couldn't create session");
        }

        const { sessionToken, refreshToken } = getTokensFromSession(session);

        const signedSessionToken = signer.sign(sessionToken);
        const signedRefreshToken = signer.sign(refreshToken);

        res.cookie("sessionToken", signedSessionToken, getSessionCookieSettings())
        res.cookie("refreshToken", signedRefreshToken, getRefeshCookieSettings());
        res.set("Hx-Redirect", "/");
        next();
      } catch (error) {
        req.logger.error(error);
        if (sendValidationErrors) {
          res.send(invalidMessage);
          return;
        }
        res.set("Hx-Redirect", "/login")
        next();
      }
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      if (!IsAuthedRequest(req)) {
        throw new Error("Not authenticated");
      }

      res.clearCookie("sessionToken");

      const sessionService = new SessionService(new SessionRepository(), new UserRepository(), new BlogRepository());
      const deleted = sessionService.deleteSession(req.token.uuid, req.user.id);

      if (!deleted) {
        throw new Error("Could not delete session");
      }
    } catch (error) {
      req.logger.error(error);
      res.set("Hx-Refresh", "true");
      res.sendStatus(500);
    }
  }
}
