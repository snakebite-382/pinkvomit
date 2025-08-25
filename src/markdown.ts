import { marked } from 'marked';
const insane = require("insane");

export function sanitizeMarkdown(source: string): string {
  return insane(source, { allowedTags: ["i", "strike", "em", "sub", "s", "strong", "u"] });
}

export function renderMarkdown(source: string): string {
  return insane(marked.parse(source));
}
