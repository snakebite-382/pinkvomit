import { ID, DB_TIMESTAMP, TimelinePost } from 'types';
import { renderMarkdown } from '../markdown';

export function renderLikeButton(liked: boolean, postID: ID) {
  return `
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="20" height="20" 
    viewBox="0 0 24 24" 
    fill="${liked ? "red" : "none"}" 
    stroke="currentColor" 
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" 
    hx-swap="outerHTML" 
    hx-target="closest .like-interaction"
    hx-post="/posts/api/like" 
    hx-vals='{ "post": "${postID}" }' 
    class="feather feather-heart clickable like-button">
      <path fill="inherit" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
  </svg>`
}

export function renderCommentButton(postID: ID) {
  return `
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" height="24" viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" 
    class="feather feather-message-square clickable comment-button"
    id="comment-button-for-${postID}">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>`
}

export function renderComment(content: string, blogTitle: string, commentID: ID) {
  return `
  <div class="comment" id="comment-${commentID}">
    <div class="commenter"><a href="/blogs/view/${blogTitle}">${blogTitle}</a></div>
    <div class="comment-content">${content}</div>
    <button class="reply-button" id="reply-button-for-${commentID}">reply</button>
    <div class="replies" 
      id="replies-for-${commentID}"
      hx-trigger="load" 
      hx-target="this"
      hx-swap="beforeend"
      hx-get="/posts/api/comments/replies?comment=${commentID}"></div>
  </div>`
}

export function renderReply(content: string, blogTitle: string, atBlogTitle: string, replyID: ID) {
  return `
  <div class="reply" id="reply-${replyID}">
    <div class="replier"><a href="/blogs/view/${blogTitle}">${blogTitle}</a> : <a href="/blogs/view/${atBlogTitle}">@${atBlogTitle}</a></div>
    <div class="reply-content">${content}</div>
    <button class="double-reply-button" id="double-reply-button-for-${replyID}">reply</button>
  </div>`
}

export function renderPost(post: TimelinePost) {
  let { id, created_at, blogTitle, content, likedByBlog, likeCount, commentCount } = post;
  return `
  <div id="post-${id}" class="post" timestamp="${Date.parse(created_at.toISOString())}">
    <div class="post-header" id="header-for-${id}"><a href="/blogs/view/${encodeURIComponent(blogTitle)}">${blogTitle}:</a></div>
    <div class="markdown" id="markdown-for-${id}">
      ${renderMarkdown(content)}
    </div>
    <div class="interactions" id="interactions-for-${id}">
      <div class="like-interaction" id="like-interaction-for-${id}">
        ${likeCount}
        ${renderLikeButton(likedByBlog, id)}
      </div>
      <div class="comment-interaction" id="comment-interaction-for-${id}">
        ${commentCount}
        ${renderCommentButton(id)}
      </div>
    </div>
    <div 
      class="comment-section closed" 
      id="comment-section-for-${id}"
    >
      <div class="comments"
        hx-trigger="load"
        hx-get="/posts/api/comments?post=${id}"
        hx-swap="beforeend"
        hx-target="this"
        id="comments-for-${id}"
      ></div>
      <div class="comment-input" id="comment-input-for-${id}">
        <form hx-post="/posts/api/create/comment" hx-target="previous .comments" hx-swap="beforeend" id="comment-form-for-${id}">
          <input type="hidden" name="postID" value="${id}">
          <input type="hidden" name="replying" value="false">
          <input type="hidden" name="commentID" value="null">
          <input type="hidden" name="atBlog" value="null">
          <label for="content">Comment: </label><input name="content" type="text" minlength="2" maxlength="1024">
          <button type="submit">post</button>
          <div id="commenter-reply-name-for-${id}" class="commenter-reply-name"></div>
          <button id="stop-replying-for-${id}" class="hidden stop-replying-button" >stop replying</button>
        </form>
      </div>
    </div>
  </div>`;
}

export function renderBlogsPosts(blogTitle: string) {
  return `
    <div 
      class="posts"
      id="posts-for-blog-${blogTitle}"
      hx-trigger="load"
      hx-get="/posts/api/blog/${blogTitle}"
      hx-target="this"
      hx-swap="beforeend"
    >
    </div>
  `
}
