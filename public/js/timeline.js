const loadMoreButton = document.getElementById("load-more");
const postsContainer = document.getElementById("posts");
const loadMoreError = document.getElementById("load-more-error");
let lastPostLength = 0;

document.addEventListener("htmx:afterRequest", (e) => {
  if (e.detail.target.getAttribute("id") == "posts") {
    posts = document.getElementsByClassName("post");

    if (lastPostLength != posts.length) {
      loadMoreError.innerHTML = ""
      lastPostLength = posts.length
    } else {
      loadMoreError.innerHTML = "No new posts, check back later";
    }

    let commentButtons = document.getElementsByClassName("comment-button");

    for (let i = 0; i < commentButtons.length; i++) {
      let splitCommentID = commentButtons[i].id.split("-")
      const commentSection = document.getElementById(`comment-section-for-${splitCommentID[splitCommentID.length - 1]}`);
      commentButtons[i].addEventListener("click", () => {
        commentSection.classList.toggle("closed");
      })
    }

    let lastTimeStamp = posts[posts.length - 1].getAttribute("timestamp");
    loadMoreButton.setAttribute("hx-post", `/posts/api/timeline?before=${lastTimeStamp}`);
    loadMoreButton.removeAttribute("disabled")
    htmx.process(loadMoreButton);
  }
})
