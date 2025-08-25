const loadMoreButton = document.getElementById("load-more");
const postsContainer = document.getElementById("posts");
const loadMoreError = document.getElementById("load-more-error");
let lastPostLength = 0;

function getLastEl(array) {
  return array[array.length - 1];
}

function commentButtonClick(e) {
  const splitCommentID = e.target.id.split("-");
  const commentSection = document.getElementById(`comment-section-for-${getLastEl(splitCommentID)}`);
  commentSection.classList.toggle("closed");
}

function replyButtonClick(element, commenterOveride = null) {
  const splitReplyID = element.id.split("-");
  const commentID = getLastEl(splitReplyID);
  const comment = element.parentNode;
  let commenter;

  if (commenterOveride == null) {
    for (let child of comment.children) {
      if (child.classList.contains("commenter")) {
        commenter = child.children.item(0).innerHTML;
      }
    }
  } else {
    commenter = commenterOveride;
  }

  const commentSection = element.parentNode.parentNode.parentNode;
  const splitCommentSectionID = commentSection.id.split("-");
  const postID = getLastEl(splitCommentSectionID);
  const commentForm = document.getElementById(`comment-form-for-${postID}`);

  for (let child of commentForm.children) {
    if (child.name == "replying") {
      child.value = true;
    } else if (child.name == "commentID") {
      child.value = `${commentID}`;
    } else if (child.classList.contains("commenter-reply-name")) {
      child.innerHTML = `replying to: ${commenter}`;
    } else if (child.classList.contains("stop-replying-button")) {
      child.classList.remove("hidden");
    } else if (child.name == "atBlog") {
      child.value = commenter;
    }
  }
}

// this is calle when a reply button on a comment is pressed
function replyButtonClickEvent(e) { replyButtonClick(e.target) }

function doubleReplyButtonClickEvent(e) {
  // this is called when a reply button on a reply is pressed
  // the only thing special to do is to get the commenter to overide default behavior,
  // and to then get a refernce to the original cmments reply button
  const splitRepliesID = e.target.parentNode.parentNode.id.split("-");
  const reply = e.target.parentNode;
  const commentID = getLastEl(splitRepliesID);
  const comment = document.getElementById(`comment-${commentID}`);

  let replier;
  let commentReplyButton;

  for (let child of comment.children) {
    if (child.classList.contains("reply-button")) {
      commentReplyButton = child;
    }
  }

  for (let child of reply.children) {
    if (child.classList.contains("replier")) {
      replier = child.children.item(0).innerHTML;
    }
  }

  replyButtonClick(commentReplyButton, replier);
}

function stopReplying(e) {
  e.target.classList.add("hidden");
  const commentForm = e.target.parentNode;

  for (let child of commentForm.children) {
    if (child.name == "replying") {
      child.value = 'false';
    } else if (child.classList.contains("commenter-reply-name")) {
      child.innerHTML = "";
    }
  }

  e.preventDefault();
}

document.addEventListener("htmx:afterRequest", (e) => {
  if (e.detail.target.getAttribute("id") == "posts") {
    // if it's targeting the posts container
    posts = document.getElementsByClassName("post");

    if (lastPostLength != posts.length) {
      loadMoreError.innerHTML = ""
      lastPostLength = posts.length
    } else {
      loadMoreError.innerHTML = "No new posts, check back later";
    }

    let commentButtons = document.getElementsByClassName("comment-button");

    for (let i = 0; i < commentButtons.length; i++) {
      commentButtons[i].addEventListener("click", commentButtonClick);
    }

    let lastTimeStamp = posts[posts.length - 1].getAttribute("timestamp");
    loadMoreButton.setAttribute("hx-post", `/posts/api/timeline?before=${lastTimeStamp}`);
    loadMoreButton.removeAttribute("disabled")
    htmx.process(loadMoreButton);
  } else if (e.detail.target.classList.contains("comments")) {
    // if it is targeting a comments container
    const replyButtons = document.getElementsByClassName("reply-button");

    for (let i = 0; i < replyButtons.length; i++) {
      replyButtons[i].addEventListener("click", replyButtonClickEvent);
    }

    const stopReplyingButtons = document.getElementsByClassName("stop-replying-button");

    for (let i = 0; i < stopReplyingButtons.length; i++) {
      stopReplyingButtons[i].addEventListener("click", stopReplying);
    }
  } else if (e.detail.target.classList.contains("replies")) {
    const doubleReplyButtons = document.getElementsByClassName("double-reply-button");

    for (let i = 0; i < doubleReplyButtons.length; i++) {
      doubleReplyButtons[i].addEventListener("click", doubleReplyButtonClickEvent);
    }
  }
})
