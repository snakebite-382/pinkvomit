import express from 'express';
const router = express.Router()
import apiRouter from './api/router';
import render from '../templating';
import { AuthedRequest } from 'types';

router.use("/api", apiRouter);

router.get('/login', (req, res) => {
  render(req as AuthedRequest, res, "auth/login", "LOGIN");
})

router.get('/signup', (req, res) => {
  render(req as AuthedRequest, res, "auth/signup", "SIGNUP");
})

export default router;

