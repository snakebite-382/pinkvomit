document.addEventListener("htmx:afterRequest", (e) => {
  if (e.detail.target.classList.contains("posts")) {
    let commentButtons = document.getElementsByClassName("comment-button");

    for (let i = 0; i < commentButtons.length; i++) {
      commentButtons[i].addEventListener("click", commentButtonClick);
    }
  } else if (e.detail.target.classList.contains("comments")) {
    addCommentEventListeners();
  } else if (e.detail.target.classList.contains("replies")) {
    addReplyEventListeners();
  }
});
