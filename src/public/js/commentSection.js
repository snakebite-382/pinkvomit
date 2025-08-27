function getLastEl(array) {
  return array[array.length - 1];
}

function commentButtonClick(e) {
  const postID = getLastEl(e.target.id.split("_"));
  const commentSection = document.getElementById(`post-comment-section-for_${postID}`);
  commentSection.classList.toggle("closed");
}

function replyButtonClick(element, commenterOveride = "") {
  const commentID = getLastEl(element.id.split("_"));
  let commenter;

  if (commenterOveride.length === 0) {
    commenter = document.getElementById(`comment-blog-title-for_${commentID}`).innerHTML;
  } else {
    commenter = commenterOveride;
  }

  const comment = document.getElementById(`comment:${commentID}`)
  const commentSection = comment.parentElement;
  const postID = getLastEl(commentSection.id.split("_"));
  const commentForm = document.getElementById(`comment-form-for_${postID}`);

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
  const replyID = getLastEl(e.target.id.split("_"));
  const reply = document.getElementById(`reply_${replyID}`);
  const commentID = getLastEl(reply.parentElement.id.split("_"));

  const commentReplyButton = document.getElementById(`comment-reply-button-for_${commentID}`);
  const replyingTo = document.getElementById(`reply-blog-title-for_${replyID}`).innerHTML;

  replyButtonClick(commentReplyButton, replyingTo);
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

function addCommentEventListeners() {
  // if it is targeting a comments container
  const replyButtons = document.getElementsByClassName("reply-button");

  for (let i = 0; i < replyButtons.length; i++) {
    replyButtons[i].addEventListener("click", replyButtonClickEvent);
  }

  const stopReplyingButtons = document.getElementsByClassName("stop-replying-button");

  for (let i = 0; i < stopReplyingButtons.length; i++) {
    stopReplyingButtons[i].addEventListener("click", stopReplying);
  }
}

function addReplyEventListeners() {
  const doubleReplyButtons = document.getElementsByClassName("double-reply-button");

  for (let i = 0; i < doubleReplyButtons.length; i++) {
    doubleReplyButtons[i].addEventListener("click", doubleReplyButtonClickEvent);
  }
}
