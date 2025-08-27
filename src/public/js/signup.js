const toggleHide = document.getElementById("toggle-hide");
const confirmPasswordInput = document.getElementById("confirm-password");
const confirmPasswordError = document.getElementById("confirm-password-error");
const passwordInput = document.getElementById("password")

toggleHide.addEventListener("click", toggle)

function toggle() {
  if (toggleHide.classList.contains("passwords-hidden")) {
    passwordInput.setAttribute("type", "text");
    confirmPasswordInput.setAttribute("type", "text");

    toggleHide.classList.replace("passwords-hidden", "passwords-shown");
    toggleHide.innerHTML = "hide passwords"
  } else {
    passwordInput.setAttribute("type", "password");
    confirmPasswordInput.setAttribute("type", "password");

    toggleHide.classList.replace("passwords-shown", "passwords-hidden");
    toggleHide.innerHTML = "show passwords"
  }
}

confirmPasswordInput.addEventListener("change", (e) => {
  if (e.target.value.localeCompare(passwordInput.value) === 0) {
    confirmPasswordError.innerHTML = ""
    return
  };

  confirmPasswordError.innerHTML = "Passwords must match"
})
