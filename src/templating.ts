import { Response } from "express";
import { AuthedRequest, DecodedJWT, User, Blog } from "./types";

export default function render(
  req: AuthedRequest,
  res: Response,
  name: string,
  title: string,
  vars: { authed?: boolean, token?: DecodedJWT | null, user?: User | null, blogs?: Blog[] | null, selectedBlog?: Blog | null, title?: string, [k: string]: any } = {}
) {
  vars.authed = req.authed;
  vars.token = req.token;
  vars.user = req.user;
  vars.blogs = req.blogs;
  vars.selectedBlog = req.selectedBlog;
  vars.title = title.toUpperCase();
  return res.render(name, vars);
}
