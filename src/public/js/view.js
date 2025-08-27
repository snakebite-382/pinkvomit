const createPageButton = document.getElementById("open-create-page");
const createPageContainer = document.getElementById("create-page");
const titleSelect = document.getElementById("title-select");
const newTitleContainer = document.getElementById("new-title-container");
const deleteButton = document.getElementById("delete-button");
const contentInput = document.getElementById("content");
let previewResult = document.getElementById("preview-result");
const parser = new DOMParser();

createPageButton.addEventListener("click", () => {
  createPageContainer.classList.toggle("hidden");

  if (createPageContainer.classList.contains("hidden")) {
    createPageButton.innerHTML = "Edit Pages";
  } else {
    htmx.trigger("#content", 'renderPreview')
    createPageButton.innerHTML = "Stop Editting Pages";
  }
})

function setVisibleElements() {
  if (titleSelect.value == "_NEW_") {
    newTitleContainer.classList.remove("hidden");
    deleteButton.classList.add("hidden");
  } else {
    newTitleContainer.classList.add("hidden");
    if (titleSelect.value.split(":")[0] != "index") {
      deleteButton.classList.remove("hidden")
    }
  }
}

async function loadInContent() {
  if (titleSelect.value != "_NEW_") {
    const response = await fetch(`/pages/api/raw?id=${titleSelect.value.split(":")[1]}`);

    if (!response.ok) {
      console.error("COULD NOT FETCH CONTENT");
    }

    const result = await response.text();

    contentInput.value = result;
  } else {
    contentInput.value = ""
  }
}

titleSelect.addEventListener("change", async () => {
  setVisibleElements();
  await loadInContent();
  htmx.trigger('#content', 'renderPreview');
})

deleteButton.addEventListener("click", (e) => {
  e.preventDefault()
})

contentInput.addEventListener("input", () => {
  htmx.trigger('#content', 'renderPreview');
})

setVisibleElements()
loadInContent()
