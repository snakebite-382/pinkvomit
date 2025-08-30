import express from 'express';
const router = express.Router();
import { AuthMiddleware } from '../middleware';
import { AuthController } from '../controller';

router.post("/validate/email", AuthController.validateEmail({}))

router.post("/validate/password", AuthController.validatePassword({}))

router.post("/signup",
  AuthController.validateEmail({ swapOutOfBounds: true }),
  AuthController.validatePassword({ swapOutOfBounds: true }),
  AuthController.signup,
  AuthController.login(false)
);

router.post("/login",
  AuthController.validateEmail({ alwaysCallNext: true }),
  AuthController.validatePassword({ alwaysCallNext: true }),
  AuthController.login()
);

router.delete("/logout", AuthMiddleware.protect((req) => ({ allowNoSelectedBlog: true })), AuthController.logout)

export default router
