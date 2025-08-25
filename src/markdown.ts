import { marked } from 'marked';
const insane = require("insane");

export default function renderMarkdown(source: string): string {
  // double sanitation is overkill but it allows limiting the allowed html tags to be used in markdown and also Sanitizes the markdown result
  let presanitizedSource = insane(source, { allowedTags: ["i", "strike", "em", "sub", "s", "strong", "u"] });
  return insane(marked.parse(presanitizedSource));
}
