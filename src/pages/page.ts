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

const maxPageLength = 65536;

export async function renderPage(
  page: Page,
  blogTitle: string,
  presanitized: boolean = true,
  rules: RenderRules = {
    postsRendered: false,
    pagesRendered: [],
    currentPageLength: 0,
  }): Promise<[string, string[]]> {
  let { content } = page;
  if (!presanitized) {
    content = sanitizeMarkdown(content);
  }

  const renderedMarkdown = renderMarkdown(content);
  const [tokens, errors] = tokenizeMarkdown(renderedMarkdown);
  rules.currentPageLength += renderedMarkdown.length;
  rules.pagesRendered.push(page.title);

  let output = ""
  let lookingForSectionEnds = 0;
  let lastLine = 0;

  for (let i = 0; i < tokens.length; i++) {
    let [tokenContent, isTag, line] = tokens[i];
    lastLine = line;

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
        case "include":
          console.log(page.title)
          if (rules.pagesRendered.includes(params[0])) {
            addError(errors, "Cannot render a page more than once", line);
            break;
          }

          const [includedPages] = await database.query("SELECT * FROM pages  WHERE BINARY title = ? AND blogID = ?",
            [params[0], page.blogID]) as [Page[], any];

          if (includedPages.length === 0) {
            addError(errors, "Page does not exist", line);
            break;
          }

          console.log(rules)
          let [includedPageContent, inclusionErrors] = await renderPage(includedPages[0], blogTitle, true, rules);
          console.log(rules)

          if (includedPageContent.length + rules.currentPageLength > maxPageLength) {
            addError(errors, `Inlcuding page ${params[0]} makes the page too long (max is ${maxPageLength} characters long)`, line)
            break;
          }

          if (inclusionErrors.length > 0) {
            addError(errors, `Unresolved errors with rendering page ${params[0]}, errors: ${inclusionErrors.join(", ")}`, line);
          }

          output += includedPageContent;

          break;

        case "section":
          output += `<div class="${params.join(', ')}">`
          lookingForSectionEnds++;
          break;
        case "end":
          if (lookingForSectionEnds === 0) {
            addError(errors, "end with no matching section beginning", line);
            break;
          }
          output += "</div>";
          lookingForSectionEnds--;
          break;
        case "nav":
          let invalidPages: string[] = [];
          let longestPage = 0;
          let navPagesValid = params.every(async (navPage) => {
            if (rules.pagesRendered.includes(navPage)) {
              addError(errors, `Cannot render page twice title: ${navPage}`, line);
              return false
            }

            let [pageExists] = await database.query("SELECT * FROM pages WHERE BINARY title = ? AND blogID = ?",
              [navPage, page.blogID]) as [Page[], any];

            if (pageExists.length === 0) {
              addError(errors, `Could not find page with title: ${navPage}`, line);
              invalidPages.push(navPage);
              return false;
            }

            const saveRuleState = rules;
            const [navPageContent, navPageErrors] = await renderPage(pageExists[0], blogTitle, true, rules);
            rules = saveRuleState;

            if (navPageErrors.length > 0) {
              addError(errors, `Unresolved errors in page ${navPage}, errors: ${navPageErrors.join(", ")}`, line);
              return false;
            }

            if (navPageContent.length + rules.currentPageLength > maxPageLength) {
              addError(errors, `Page ${navPage} would make the page too long (max length is ${maxPageLength}`, line);
              return false;
            }

            return true;
          })

          if (!navPagesValid) {
            break;
          }

          let navID = crypto.randomUUID();
          console.log(params)

          output += `<ul id="page-nav_${navID}" class="pagesNav">
${params.map((pageTitle, index) => {
            return `<li id="page-nav-item_${pageTitle}" class="page-nav-item-for_${navID}">
  <form 
      hx-post="/pages/api/navigate/"
      hx-trigger="click${index === 0 ? ", load" : ""}"
      hx-target="#page-nav-result-for_${navID}"
      hx-swap="innerHTML"
  >
    <input type="hidden" name="rules" value='${JSON.stringify(rules)}'>
    <input type="hidden" name="title" value="${pageTitle}">
    <input type="hidden" name="blogID" value="${page.blogID}">
    <input type="hidden" name="blogTitle" value="${blogTitle}" >
    <a href="" hx-trigger="never">${pageTitle}</a>
  </form>
</li>
`}).join(" ")}
</ul>
<div id="page-nav-result-for_${navID}" class="page-nav-result"></div>`

          break;
        default:
          addError(errors, `Unkown Tag, ${tagName}`, line)
          break;
      }

    } else {
      output += tokenContent;
      rules.currentPageLength += tokenContent.length;
    }

  }

  if (lookingForSectionEnds > 0) {
    addError(errors, "Unclosed section tag, every section needs a matching end", lastLine);
  }

  return [output, errors]
}


