const loadMoreButton = document.getElementById("load-more");
const postsContainer = document.getElementById("posts");
const loadMoreError = document.getElementById("load-more-error");
let lastPostLength = 0;
let posts;

document.addEventListener("htmx:afterRequest", (e) => {
  let posts = document.getElementsByClassName("post");

  if (lastPostLength != posts.length) {
    loadMoreError.innerHTML = ""
    lastPostLength = posts.length
  } else {
    loadMoreError.innerHTML = "No new posts, check back later";
  }

  let lastTimeStamp = posts[posts.length - 1].getAttribute("timestamp");
  loadMoreButton.setAttribute("hx-post", `/posts/api/timeline?before=${lastTimeStamp}`);
  loadMoreButton.removeAttribute("disabled")
  htmx.process(loadMoreButton);
})
