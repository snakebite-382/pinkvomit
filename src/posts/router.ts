import express from 'express';
const router = express.Router();
import render from '../templating';
import { protect } from '../auth/middleware';

import apiRouter from './api/router';
import { IsAuthedRequest } from 'types';
router.use("/api", apiRouter);

router.get("/timeline", protect(), (req, res) => {
  if (!IsAuthedRequest(req)) {
    res.sendStatus(500);
    return;
  }
  render(req, res, "posts/timeline", "TIMELINE");
})

router.get("/create", protect(), (req, res) => {
  if (!IsAuthedRequest(req)) {
    res.sendStatus(500);
    return;
  }
  render(req, res, "posts/create", "CREATE POST")
})


export default router;
