const toggleHide = document.getElementById("toggle-hide");
const passwordInput = document.getElementById("password");

toggleHide.addEventListener("click", () => {
  if (passwordInput.type == "text") {
    passwordInput.setAttribute("type", "password");
    toggleHide.innerHTML = "show password";
  } else {
    passwordInput.setAttribute("type", "text");
    toggleHide.innerHTML = "hide password"
  }
})
