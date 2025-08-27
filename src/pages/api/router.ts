import express from "express";
import { protect } from "src/auth/middleware";
import { renderPage } from "../page";
import database from "../../database";
import { ID, IsAuthedRequest, Page } from "types";
import { sanitizeMarkdown } from "src/markdown";
const router = express.Router();

function checkTitleProtected(title: string): boolean {
  switch (title.toLowerCase().trim().replace(/[0-9]/g, '').replace("-", "").replace("_", "")) {
    case "new":
      return true;
    default:
      return false;

  }
}

router.post("/preview",
  protect((req) => ({ ownsBlog: { id: req.body.id } })),
  async (req, res) => {
    if (!IsAuthedRequest(req)) {
      res.sendStatus(500);
      return;
    }

    const [pageTitle, pageID] = req.body.title.split(":");

    const page: Page = {
      id: pageID,
      blogID: req.body.id as ID,
      title: pageTitle,
      content: req.body.content,
      created_at: new Date(),
      updated_at: new Date()
    }
    try {
      const [output, errors] = await renderPage(page, req.body.blogTitle, false);
      const result = `
    <div id="preview-result">
      ${output}
      <div id="preview-errors">
        ${errors.length === 0 ? "" : errors.map(error => `<div class="error">${error}</div>`)}
      </div>
    </div>`
      res.send(result);
    } catch (error) {
      console.error(error);
      res.sendStatus(500);
      return;
    }
  }
);

router.post("/update",
  protect((req) => ({ ownsBlog: { id: req.body.id } })),
  async (req, res) => {
    if (!IsAuthedRequest(req)) {
      res.sendStatus(500);
      return;
    }

    let [pageTitle, pageID] = req.body.title.split(":");
    const sanitizedContent = sanitizeMarkdown(req.body.content);


    try {
      if (req.body.title == "_NEW_") {
        pageID = crypto.randomUUID();
        pageTitle = req.body['new-title'] as string;

        const titleChars = "qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM0123456789_-";
        let invalidChars = [];
        let titleValid = pageTitle.length >= 3;
        let titleProtected = checkTitleProtected(pageTitle);

        if (titleValid) {
          for (let i = 0; i < pageTitle.length; i++) {
            if (!titleChars.includes(pageTitle.charAt(i))) {
              titleValid = false;
              invalidChars.push(pageTitle.charAt(i));
            }
          }
        }

        if (!titleValid) {
          if (invalidChars.length > 0) {
            res.send(`<div id="update-result" class="error">Invalid characters in title: ${invalidChars.join(", ")}</div>`);
          } else {
            res.send(`<div id="update-result" class="error">Title must be at least 3 characters long</div>`)
          }
          return;
        }

        if (titleProtected) {
          res.send(`<div id="update-result" class="error">Title is protected from use: ${pageTitle}</div>`)
          return;
        }

        const [pageInsert] = await database.query("INSERT INTO pages (id, content, title, blogID) VALUES (?, ?, ?, ?)",
          [pageID, sanitizedContent, pageTitle, req.body.id]);

        res.set("Hx-Refresh", "true")
        res.send(`<div id="update-result" class="success">Created page ${pageTitle}</div>`)
      } else {

        const [pageUpdate] = await database.query("UPDATE pages SET content = ? WHERE BINARY title = ? AND blogID = ?",
          [sanitizedContent, pageTitle, req.body.id]);

        res.set("Hx-Refresh", "true")
        res.send(`<div id="update-result" class="success">Updated page ${pageTitle}</div>`)
      }
    } catch (error) {
      console.error(error);
      res.send("<div id='update-result' class='error'>SERVER ERROR</div>")
      return;
    }
  }
);

router.post("/navigate", protect(), async (req, res) => {
  if (!IsAuthedRequest(req)) {
    res.sendStatus(500);
    return;
  }
  console.log(req.body);

  let { rules, title, blogID, blogTitle } = req.body;
  rules = JSON.parse(rules);

  try {
    let [getPages] = await database.query("SELECT * FROM pages WHERE BINARY title = ? AND blogID = ?", [title, blogID]) as [Page[], any];

    if (getPages.length === 0) {
      res.send(`<div class="error">Could not find page ${title}</div>`)
    }

    let [renderedPage, errors] = await renderPage(getPages[0], blogTitle, true, rules);

    if (errors.length > 0) {
      res.send("<div class='error'>There were errors with rendering this page that must be resolved before it can be used</div>")
      return;
    }

    res.send(renderedPage);

  } catch (error) {
    console.error(error);
    res.send("<div class='error'>SERVER ERROR</div>")
    return;
  }

})

router.get("/raw", protect(), async (req, res) => {
  try {
    const [pages] = await database.query("SELECT content FROM pages WHERE id = ?", [req.query.id]) as [Page[], any];

    res.send(pages[0].content)
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
    return;
  }
});

export default router;
