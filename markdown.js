const { marked } = require("marked");
const insane = require("insane");

const renderMarkdown = (source) => {
  let presanitizedSource = insane(source, { allowedTags: ["i", "strike", "em", "sub", "s", "strong", "u"] });
  return insane(marked.parse(presanitizedSource));
}

module.exports = renderMarkdown;
