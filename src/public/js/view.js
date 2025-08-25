const createPageButton = document.getElementById("open-create-page");
const createPageContainer = document.getElementById("create-page");

createPageButton.addEventListener("click", () => {
  createPageContainer.classList.toggle("hidden");

  if (createPageContainer.classList.contains("hidden")) {
    createPageButton.innerHTML = "Create Page";
  } else {
    createPageButton.innerHTML = "Stop Creating Page";
  }
})
