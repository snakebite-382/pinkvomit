import { Request } from "express";
import { validate as isValidUUID } from 'uuid';

export type ID = string;
export function IsID(id: any): id is ID {
  const valid = typeof id == "string" && isValidUUID(id);
  if (!valid && id !== null) { // don't log if null is explicitly allowed elsewhere
    console.log(`IsID failed`, {
      value: id,
      typeof: typeof id,
      isValidUUID: isValidUUID(id)
    });
  }
  return valid;
}

export type DB_TIMESTAMP = Date;
export function IsDBTimestamp(ts: any): ts is DB_TIMESTAMP {
  const valid = typeof ts == "object" && ts instanceof Date;
  if (!valid) {
    console.log("IsDBTimestamp failed", {
      value: ts,
      typeof: typeof ts,
      instanceofDate: ts instanceof Date
    });
  }
  return valid;
}

export interface DB_OBJECT {
  id: ID,
  created_at: DB_TIMESTAMP,
  updated_at: DB_TIMESTAMP,
}

function IsDBObject(obj: object): obj is DB_OBJECT {
  const valid = (
    "id" in obj &&
    IsID((obj as any).id) &&
    "created_at" in obj &&
    IsDBTimestamp((obj as any).created_at) &&
    "updated_at" in obj &&
    IsDBTimestamp((obj as any).updated_at)
  );

  if (!valid) {
    console.log("IsDBObject failed", {
      obj,
      hasId: "id" in obj,
      idValid: "id" in obj ? IsID((obj as any).id) : false,
      hasCreatedAt: "created_at" in obj,
      createdAtValid: "created_at" in obj ? IsDBTimestamp((obj as any).created_at) : false,
      hasUpdatedAt: "updated_at" in obj,
      updatedAtValid: "updated_at" in obj ? IsDBTimestamp((obj as any).updated_at) : false
    });
  }
  return valid;
}

export interface User extends DB_OBJECT {
  email: string,
  password: string,
  emailVerified: 0 | 1,
  mainBlogID: ID | null,
}

export function IsUser(user: object): user is User {
  const valid = (
    IsDBObject(user) &&
    "email" in user &&
    typeof (user as any).email == "string" &&
    "password" in user &&
    typeof (user as any).password == "string" &&
    "emailVerified" in user &&
    ((user as any).emailVerified === 0 || (user as any).emailVerified === 1) &&
    "mainBlogID" in user &&
    ((user as any).mainBlogID === null || IsID((user as any).mainBlogID))
  );

  if (!valid) {
    console.log("IsUser failed", {
      user,
      dbObjectValid: IsDBObject(user),
      email: (user as any).email,
      emailValid: typeof (user as any).email === "string",
      passwordValid: typeof (user as any).password === "string",
      emailVerified: (user as any).emailVerified,
      emailVerifiedValid: (user as any).emailVerified === 0 || (user as any).emailVerified === 1,
      mainBlogID: (user as any).mainBlogID,
      mainBlogIDValid: (user as any).mainBlogID === null || IsID((user as any).mainBlogID)
    });
  }
  return valid;
}

export interface Session extends DB_OBJECT {
  userID: ID,
  selectedBlogID: ID | null,
  expiresAt: number,
}

export function IsSession(session: object): session is Session {
  const valid = (
    IsDBObject(session) &&
    "uuid" in session &&
    typeof (session as any).uuid == "string" &&
    "userID" in session &&
    IsID((session as any).userID) &&
    "selectedBlogID" in session &&
    IsID((session as any).selectedBlogID) &&
    "expiresAt" in session &&
    typeof (session as any).expiresAt == "number"
  );

  if (!valid) {
    console.log("IsSession failed", { session });
  }
  return valid;
}

export interface Blog extends DB_OBJECT {
  title: string,
  stylesheet: string,
  userID: ID | null
}

export function IsBlog(blog: object): blog is Blog {
  const valid = (
    IsDBObject(blog) &&
    "title" in blog &&
    typeof (blog as any).title == "string" &&
    "stylesheet" in blog &&
    typeof (blog as any).stylesheet == "string" &&
    "userID" in blog &&
    ((blog as any).userID === null || IsID((blog as any).userID))
  );

  if (!valid) {
    console.log("IsBlog failed", { blog });
  }
  return valid;
}

export interface Page extends DB_OBJECT {
  title: string,
  content: string,
  blogID: ID | null
}

export function IsPage(page: object): page is Page {
  const valid = (
    IsDBObject(page) &&
    "title" in page &&
    typeof (page as any).title == "string" &&
    "content" in page &&
    typeof (page as any).content == "string" &&
    "blogID" in page &&
    ((page as any).blogID === null || IsID((page as any).blogID))
  );

  if (!valid) {
    console.log("IsPage failed", { page });
  }
  return valid;
}

export interface Post extends DB_OBJECT {
  content: string,
  blogID: ID | null,
}

export function IsPost(post: object): post is Post {
  const valid = (
    IsDBObject(post) &&
    "content" in post &&
    typeof (post as any).content == "string" &&
    "blogID" in post &&
    ((post as any).blogID === null || IsID((post as any).blogID))
  );

  if (!valid) {
    console.log("IsPost failed", { post });
  }
  return valid;
}

export interface TimelinePost extends Post {
  likedByBlog: boolean,
  likeCount: number,
  commentCount: number,
  blogTitle: string
}

export function IsTimelinePost(post: object): post is TimelinePost {
  const valid = (
    IsPost(post) &&
    "likedByBlog" in post &&
    typeof (post as any).likedByBlog == "boolean" &&
    "likeCount" in post &&
    typeof (post as any).likeCount == "number" &&
    "commentCount" in post &&
    typeof (post as any).commentCount == "number" &&
    "blogTitle" in post &&
    typeof (post as any).blogTitle == "string"
  );

  if (!valid) {
    console.log("IsTimelinePost failed", { post });
  }
  return valid;
}

export interface Comment extends DB_OBJECT {
  content: string,
  postID: ID | null,
  blogID: ID | null
}

export function IsComment(comment: object): comment is Comment {
  const valid = (
    IsDBObject(comment) &&
    "content" in comment &&
    typeof (comment as any).content == "string" &&
    "postID" in comment &&
    ((comment as any).postID === null || IsID((comment as any).postID)) &&
    "blogID" in comment &&
    ((comment as any).blogID === null || IsID((comment as any).blogID))
  );

  if (!valid) {
    console.log("IsComment failed", { comment });
  }
  return valid;
}

export interface TimelineComment extends Comment {
  blogTitle: string
}

export function IsTimelineComment(comment: object): comment is TimelineComment {
  const valid = (
    IsComment(comment) &&
    "blogTitle" in comment &&
    typeof (comment as any).blogTitle == "string"
  );

  if (!valid) {
    console.log("IsTimelineComment failed", { comment });
  }
  return valid;
}

export interface Reply extends DB_OBJECT {
  content: string,
  commentID: ID | null,
  blogID: ID | null,
  atBlog: string
}

export function IsReply(reply: object): reply is Reply {
  const valid = (
    IsDBObject(reply) &&
    "content" in reply &&
    typeof (reply as any).content == "string" &&
    "commentID" in reply &&
    ((reply as any).commentID === null || IsID((reply as any).commentID)) &&
    "blogID" in reply &&
    ((reply as any).blogID === null || IsID((reply as any).blogID)) &&
    "atBlog" in reply &&
    typeof (reply as any).atBlog == "string"
  );

  if (!valid) {
    console.log("IsReply failed", { reply });
  }
  return valid;
}

export interface TimelineReply extends Reply {
  blogTitle: string
}

export function IsTimelineReply(reply: object): reply is TimelineReply {
  const valid = (
    IsReply(reply) &&
    "blogTitle" in reply &&
    typeof (reply as any).blogTitle == "string"
  );

  if (!valid) {
    console.log("IsTimelineReply failed", { reply });
  }
  return valid;
}

export interface Follow extends DB_OBJECT {
  following_blogID: ID | null,
  followed_blogID: ID | null,
}

export function IsFollow(follow: object): follow is Follow {
  const valid = (
    IsDBObject(follow) &&
    "followed_blogID" in follow &&
    ((follow as any).followed_blogID === null || IsID((follow as any).followed_blogID)) &&
    "following_blogID" in follow &&
    ((follow as any).following_blogID === null || IsID((follow as any).following_blogID))
  );

  if (!valid) {
    console.log("IsFollow failed", { follow });
  }
  return valid;
}

export interface ProtectOptions {
  ownsBlog?: {
    id?: ID,
    title: string
  } | {
    id: ID,
    title?: string
  },
  allowNoSelectedBlog?: boolean,
}

export type AuthedRequest<
  P = any,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any
> = Request<P, ResBody, ReqBody, ReqQuery> & {
  user: User;
  authed: true,
  token: DecodedJWT,
  blogs: Blog[],
  selectedBlog: Blog
};

export function IsAuthedRequest(req: Request): req is AuthedRequest {
  const valid = (
    "user" in req &&
    req.user != null &&
    IsUser(req.user) &&
    "authed" in req &&
    req.authed === true &&
    "token" in req &&
    req.token != null &&
    IsDecodedJWT(req.token) &&
    "blogs" in req &&
    Array.isArray(req.blogs) &&
    req.blogs.every(IsBlog) &&
    "selectedBlog" in req &&
    (req.selectedBlog == null || IsBlog(req.selectedBlog))
  );

  // if (!valid) {
  //   console.log("IsAuthedRequest failed", {
  //     user: req.user,
  //     isUser: req.user ? IsUser(req.user) : false,
  //     authed: req.authed,
  //     token: req.token,
  //     isDecodedJWT: req.token ? IsDecodedJWT(req.token) : false,
  //     blogs: req.blogs,
  //     blogsValid: Array.isArray(req.blogs) && req.blogs.every(IsBlog),
  //     selectedBlog: req.selectedBlog,
  //     selectedBlogValid: req.selectedBlog == null || IsBlog(req.selectedBlog)
  //   });
  // }
  return valid;
}

export interface DecodedJWT {
  uuid: ID,
  exp: number,
  iat: number
}

export function IsDecodedJWT(token: object): token is DecodedJWT {
  const valid = (
    "uuid" in token &&
    IsID(token.uuid) &&
    "exp" in token &&
    typeof (token as any).exp == "number" &&
    "iat" in token &&
    typeof (token as any).iat == "number"
  );

  if (!valid) {
    console.log("IsDecodedJWT failed", { token });
  }
  return valid;
}

export type GetProtectOptions = (req: any) => ProtectOptions;

