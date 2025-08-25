import { Request } from "express";

export type ID = number;
export function IsID(id: any): id is ID {
  return typeof id == "number";
}
export type DB_TIMESTAMP = Date;
export function IsDBTimestamp(ts: any): ts is DB_TIMESTAMP {
  return typeof ts == "object" && ts instanceof Date;
}

export interface DB_OBJECT {
  id: ID,
  created_at: DB_TIMESTAMP,
  updated_at: DB_TIMESTAMP,
}

function IsDBObject(obj: object): obj is DB_OBJECT {
  return (
    "id" in obj &&
    IsID((obj as any).id) &&
    "created_at" in obj &&
    IsDBTimestamp((obj as any).created_at) &&
    "updated_at" in obj &&
    IsDBTimestamp((obj as any).updated_at)
  );
}


export interface User extends DB_OBJECT {
  id: ID,
  email: string,
  password: string,
  emailVerified: 0 | 1,
  mainBlogID: ID,
  created_at: DB_TIMESTAMP,
  updated_at: DB_TIMESTAMP
}

export function IsUser(user: object): user is User {
  return (
    IsDBObject(user) &&
    "email" in user &&
    typeof user.email == "string" &&
    "password" in user &&
    typeof user.password == "string" &&
    "emailVerified" in user &&
    (user.emailVerified === 0 || user.emailVerified === 1) &&
    "mainBlogID" in user &&
    IsID(user.mainBlogID)
  )
}

export interface Session extends DB_OBJECT {
  uuid: string,
  userID: ID,
  selectedBlogID: ID,
  expiresAt: number,
}

export function IsSession(session: object): session is Session {
  return (
    IsDBObject(session) &&
    "uuid" in session &&
    typeof session.uuid == "string" &&
    "userID" in session &&
    IsID(session.userID) &&
    "selectedBlogID" in session &&
    IsID(session.selectedBlogID) &&
    "expiresAt" in session &&
    typeof session.expiresAt == "number"
  )
}

export interface Blog extends DB_OBJECT {
  title: string,
  stylesheet: string,
  userID: ID
}

export function IsBlog(blog: object): blog is Blog {
  return (
    IsDBObject(blog) &&
    "title" in blog &&
    typeof blog.title == "string" &&
    "stylesheet" in blog &&
    typeof blog.stylesheet == "string" &&
    "userID" in blog &&
    IsID(blog.userID)
  )
}

export interface Page extends DB_OBJECT {
  title: string,
  content: string,
  blogID: ID
}

export function IsPage(page: object): page is Page {
  return (
    IsDBObject(page) &&
    "title" in page &&
    typeof page.title == "string" &&
    "content" in page &&
    typeof page.content == "string" &&
    "blogID" in page &&
    IsID(page.blogID)
  )
}

export interface Post extends DB_OBJECT {
  content: string,
  blogID: ID,
}

export function IsPost(post: object): post is Post {
  return (
    IsDBObject(post) &&
    "content" in post &&
    typeof post.content == "string" &&
    "blogID" in post &&
    IsID(post.blogID)
  )
}

export interface TimelinePost extends Post {
  likedByBlog: boolean,
  likeCount: number,
  commentCount: number,
  blogTitle: string
}

export function IsTimelinePost(post: object): post is TimelinePost {
  return (
    IsPost(post) &&
    "likedByBlog" in post &&
    typeof post.likedByBlog == "boolean" &&
    "likeCount" in post &&
    typeof post.likeCount == "number" &&
    "commentCount" in post &&
    typeof post.commentCount == "number"
  )
}

export interface Comment extends DB_OBJECT {
  content: string,
  postID: ID,
  blogID: ID
}

export function IsComment(comment: object): comment is Comment {
  return (
    IsDBObject(comment) &&
    "content" in comment &&
    typeof comment.content == "string" &&
    "postID" in comment &&
    IsID(comment.postID) &&
    "blogID" in comment &&
    IsID(comment.blogID)
  )
}

export interface TimelineComment extends Comment {
  blogTitle: string
}

export function IsTimelineComment(comment: object): comment is TimelineComment {
  return (
    IsComment(comment) &&
    "blogTitle" in comment &&
    typeof comment.blogTitle == "string"
  )
}

export interface Reply extends DB_OBJECT {
  content: string,
  commentID: ID,
  blogID: ID,
  atBlog: string
}

export function IsReply(reply: object): reply is Reply {
  return (
    IsDBObject(reply) &&
    "content" in reply &&
    typeof reply.content == "string" &&
    "commentID" in reply &&
    IsID(reply.commentID) &&
    "blogID" in reply &&
    IsID(reply.blogID) &&
    "atBlog" in reply &&
    typeof reply.atBlog == "string"
  )
}

export interface TimelineReply extends Reply {
  blogTitle: string
}

export function IsTimelineReply(reply: object): reply is TimelineReply {
  return (
    IsReply(reply) &&
    "blogTitle" in reply &&
    typeof reply.blogTitle == "string"
  )
}

export interface Follow extends DB_OBJECT {
  following_blogID: ID,
  followed_blogID: ID,
}

export function IsFollow(follow: object): follow is Follow {
  return (
    IsDBObject(follow) &&
    "followed_blogID" in follow &&
    IsID(follow.followed_blogID) &&
    "following_blogID" in follow &&
    IsID(follow.following_blogID)
  )
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
  selectedBlog: Blog | null
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

  if (!valid) {
    console.log("IsAuthedRequest failed check", {
      user: req.user,
      isUser: req.user ? IsUser(req.user) : false,
      authed: req.authed,
      token: req.token,
      isDecodedJWT: req.token ? IsDecodedJWT(req.token) : false,
      blogs: req.blogs,
      blogsValid: Array.isArray(req.blogs) && req.blogs.every(IsBlog),
      selectedBlog: req.selectedBlog,
      selectedBlogValid: req.selectedBlog == null || IsBlog(req.selectedBlog)
    });
  }
  return valid;
}

export interface DecodedJWT {
  email: string,
  uuid: string,
  exp: number,
  iat: number
}

export function IsDecodedJWT(token: object): token is DecodedJWT {
  return ("email" in token &&
    typeof token.email == "string" &&
    "uuid" in token &&
    typeof token.uuid == "string" &&
    "exp" in token &&
    typeof token.exp == "number" &&
    "iat" in token &&
    typeof token.iat == "number"
  )
}
export type GetProtectOptions = (req: any) => ProtectOptions;
