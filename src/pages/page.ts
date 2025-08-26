import { ID, Page } from "types";
import database from "../database";
import { ResultSetHeader } from "mysql2";
import { renderMarkdown, sanitizeMarkdown } from "../markdown";
import { renderBlogsPosts } from "src/posts/render";

export async function createPage(title: string, content: string, blogID: ID): Promise<[Page, true] | [null, false]> {
  const [insertPage] = await database.query<ResultSetHeader>("INSERT INTO pages (title, content, blogID) VALUES (?, ?, ?)", [title, sanitizeMarkdown(content), blogID])
  const [getPages] = await database.query("SELECT * FROM pages WHERE id = ?", [insertPage.insertId]) as [Page[], any];
  return [getPages[0], true];
}

function addError(errors: string[], error: string, line: number) {
  errors.push(`Error on line ${line} : ${error}`);
}

type token = [string, boolean, number]; // tokenContent, isTag, line

function tokenizeMarkdown(content: string): [token[], string[]] {
  let errors: string[] = [];

  let tokens: token[] = [];
  let tokenContent = "";
  let skipNext = false;
  let lookingForClose = false;
  let line = 1

  for (let i = 0; i < content.length; i++) {
    let char = content.charAt(i);

    if (skipNext) {
      tokenContent += char;
      skipNext = false;
      continue;
    }

    switch (char) {
      case '[':
        if (lookingForClose) {
          addError(errors, "Nested square brackets", line)
        } else {
          tokens.push([tokenContent, false, line]);
          tokenContent = ""
          tokenContent += char;
          lookingForClose = true;
        }
        break;
      case ']':
        if (lookingForClose) {
          tokenContent += char;
          tokens.push([tokenContent, true, line]);
          tokenContent = ""
          lookingForClose = false;
        }
        break;
      case '\n':
        if (lookingForClose) {
          tokenContent += char;
          line++
        } else {
          tokenContent += char;
          tokens.push([tokenContent, false, line])
          tokenContent = ""
          line++
        }
        break;
      case '\\':
        skipNext = true;
        tokenContent += char;
        break;
      default:
        tokenContent += char;
        break;
    }
  }
  if (tokenContent.length > 0) {
    tokens.push([tokenContent, false, line]);
  }

  if (lookingForClose) {
    addError(errors, "No Closing Bracket", line);
  }

  return [tokens, errors];
}

function parseTag(content: string, errors: string[], line: number): [string, string[]] {
  let inParens = false;
  let closedParens = false;
  let tagName = "";
  let params: string[] = [""];
  let paramIndex = 0;
  content = content.substring(1, content.length - 1)


  for (let i = 0; i < content.length; i++) {
    let char = content.charAt(i);
    switch (char) {
      case "(":
        if (inParens) {
          addError(errors, "Malformed Tag, nested parentheses not allowed", line);
        } else {
          inParens = true;
        }
        break;
      case ")":
        if (inParens) {
          closedParens = true;
        } else {
          addError(errors, 'Malformed Tag, stray ")" ', line);
        }
        break;
      case ",":
        if (inParens) {
          paramIndex += 1;
          params[paramIndex] = "";
        } else {
          addError(errors, 'Malformed Tag, stray "," ', line);
        }
        break;
      default:
        if (inParens) {
          params[paramIndex] += char;
        } else {
          tagName += char;
        }
        break;
    }

    if (closedParens) {
      break;
    }
  }

  if (!closedParens && inParens) {
    addError(errors, "Malformed Tag, no closing parenthesis", -1);
  }

  params = params.map(param => param.trim());

  return [tagName.trim(), params]
}

interface RenderRules {
  postsRendered: boolean,
  pagesRendered: string[],
  currentPageLength: number,
}

const maxPageLength = 16384;

export async function renderPage(
  content: string,
  blogTitle: string,
  presanitized: boolean = true,
  rules: RenderRules = {
    postsRendered: false,
    pagesRendered: [],
    currentPageLength: 0,
  }): Promise<[string, string[]]> {
  if (!presanitized) {
    content = sanitizeMarkdown(content);
  }

  const renderedMarkdown = renderMarkdown(content);
  const [tokens, errors] = tokenizeMarkdown(renderedMarkdown);
  rules.currentPageLength = renderedMarkdown.length;

  let output = ""

  for (let i = 0; i < tokens.length; i++) {
    let [tokenContent, isTag, line] = tokens[i];

    if (isTag) {
      let [tagName, params] = parseTag(tokenContent, errors, line);

      switch (tagName) {
        case "posts":
          if (rules.postsRendered) {
            addError(errors, "Cannot render posts more than once", line);
          } else {
            output += renderBlogsPosts(blogTitle, params.includes("minimal"));
            rules.postsRendered = true;
          }
          break;
        default:
          addError(errors, `Unkown Tag, ${tagName}`, line)
          break;
      }

    } else {
      output += tokenContent;
    }

  }
  return [output, errors]
}


