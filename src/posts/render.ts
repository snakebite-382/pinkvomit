import { ID, DB_TIMESTAMP, TimelinePost, TimelineReply, TimelineComment } from 'types';
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
    id="post-like-button-for_${postID}"
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
    id="post-comment-button-for_${postID}">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>`
}

export function renderComment(comment: TimelineComment) {
  const { content, blogTitle, id } = comment;
  return `
  <div class="comment" id="comment:${id}">
    <div class="commenter" id="comment-commenter-for_${id}"><a id="comment-blog-title-for_${id}" href="/blogs/view/${blogTitle}">${blogTitle}</a></div>
    <div class="comment-content" id="comment-content-for_${id}">${content}</div>
    <button class="reply-button" id="comment-reply-button-for_${id}">reply</button>
    <div class="replies" 
      id="comment-replies-for_${id}"
      hx-trigger="load" 
      hx-target="this"
      hx-swap="beforeend"
      hx-get="/posts/api/comments/replies?comment=${id}"></div>
  </div>`
}

export function renderReply(reply: TimelineReply) {
  const { content, blogTitle, atBlog, id } = reply;
  return `
  <div class="reply" id="reply_${id}">
    <div class="replier" id="reply-replier-for_${id}">
      <a id="reply-blog-title-for_${id}" href="/blogs/view/${blogTitle}">${blogTitle}</a> : <a href="/blogs/view/${atBlog}">@${atBlog}</a>
    </div>
    <div class="reply-content" id="reply-content-for_${id}">${content}</div>
    <button class="double-reply-button" id="reply-double-reply-button-for_${id}">reply</button>
  </div>`
}

export function renderPost(post: TimelinePost, minimal: boolean = false) {
  let { id, created_at, blogTitle, content, likedByBlog, likeCount, commentCount } = post;
  return `
  <div id="post:${id}" class="post" timestamp="${Date.parse(created_at.toISOString())}">
    <div class="post-header" id="post-header-for_${id}">
      <a id="post-blog-title-for_${id}" href="/blogs/view/${encodeURIComponent(blogTitle)}">${blogTitle}:</a>
    </div>
    <div class="markdown" id="post-markdown-for_${id}">
      ${renderMarkdown(content)}
    </div>
    ${minimal ? "" : `
    <div class="interactions" id="post-interactions-for_${id}">
      <div class="like-interaction" id="post-like-interaction-for_${id}">
        ${likeCount}
        ${renderLikeButton(likedByBlog, id)}
      </div>
      <div class="comment-interaction" id="post-comment-interaction-for_${id}">
        ${commentCount}
        ${renderCommentButton(id)}
      </div>
    </div>
    <div 
      class="comment-section closed" 
      id="post-comment-section-for_${id}"
    >
      <div class="comments"
        hx-trigger="load"
        hx-get="/posts/api/comments?post=${id}"
        hx-swap="beforeend"
        hx-target="this"
        id="post-comments-for_${id}"
      ></div>
      <div class="comment-input" id="post-comment-input-for_${id}">
        <form hx-post="/posts/api/create/comment" hx-target="previous .comments" hx-swap="beforeend" id="comment-form-for_${id}">
          <input type="hidden" name="postID" value="${id}">
          <input type="hidden" name="replying" value="false">
          <input type="hidden" name="commentID" value="null">
          <input type="hidden" name="atBlog" value="null">
          <label for="content">Comment: </label><input name="content" type="text" minlength="2" maxlength="1024">
          <button type="submit">post</button>
          <div id="post-commenter-reply-name-for_${id}" class="commenter-reply-name"></div>
          <button id="post-stop-replying-for_${id}" class="hidden stop-replying-button" >stop replying</button>
        </form>
      </div>
    </div>
    `}
  </div>`;
}

export function renderBlogsPosts(blogTitle: string, minimal: boolean) {
  return `
    <div 
      class="posts"
      id="posts-for-blog-${blogTitle}"
      hx-trigger="load"
      hx-get="/posts/api/blog/${blogTitle}?minimal=${minimal}"
      hx-target="this"
      hx-swap="beforeend"
    >
    </div>
    <script src="/js/commentSection.js"></script>
    <script src="/js/blogsPosts.js"></script>
  `
}
