import express from "express";
import { protect } from "src/auth/middleware";
import { renderPage } from "../page";
import database from "../../database";
import { ID, IsAuthedRequest, Page } from "types";
import { sanitizeMarkdown } from "src/markdown";
import { pageValidator } from "src/validation";
import { valid } from "joi";
const router = express.Router();

function checkTitleProtected(title: string): boolean {
  switch (title.toLowerCase()) {
    case "new":
      return true;
    default:
      return false;
  }
}

router.post("/preview",
  protect((req) => ({ ownsBlog: { id: req.body.id, title: req.body.blogTitle } })),
  async (req, res) => {
    if (!IsAuthedRequest(req)) {
      res.sendStatus(500);
      return;
    }

    const [pageTitle, pageID] = req.body.title.split(":");

    let { value, error } = pageValidator.validate({ title: pageTitle, content: req.body.content })

    if (error != undefined) {
      res.send(`
      <div id="preview-result">
        <div id="preview-errors">
          ${error.message}
        </div>
      </div>`)
      return;
    }

    const page: Page = {
      id: pageID,
      blogID: req.body.id as ID,
      title: value.title,
      content: value.content,
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
      req.logger.error(error);
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

    const { value, error } = pageValidator.validate({ title: pageTitle, content: sanitizedContent });

    if (error != undefined) {
      res.send(`<div id="update-result" class="error">${error.message}</div>`)
      return;
    }

    try {
      if (req.body.title == "_NEW_") {
        pageID = crypto.randomUUID();
        pageTitle = req.body['new-title'] as string;

        const { value, error } = pageValidator.validate({ title: pageTitle, content: sanitizedContent });

        if (error != undefined) {
          res.send(`<div id="update-result" class="error">${error.message}</div>`)
          return;
        }

        if (checkTitleProtected(value.title)) {
          res.send(`<div id="update-result" class="error">Title is protected from use: ${value.title}</div>`)
          return;
        }

        const [pageInsert] = await database.query("INSERT INTO pages (id, content, title, blogID) VALUES (?, ?, ?, ?)",
          [pageID, value.content, value.title, req.body.id]);

        res.set("Hx-Refresh", "true")
        res.send(`<div id="update-result" class="success">Created page ${value.title}</div>`)
      } else {

        const [pageUpdate] = await database.query("UPDATE pages SET content = ? WHERE BINARY title = ? AND blogID = ?",
          [value.content, value.title, req.body.id]);

        res.set("Hx-Refresh", "true")
        res.send(`<div id="update-result" class="success">Updated page ${value.title}</div>`)
      }
    } catch (error) {
      req.logger.error(error);
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
    req.logger.error(error);
    res.send("<div class='error'>SERVER ERROR</div>")
    return;
  }

})

router.get("/raw", protect(), async (req, res) => {
  try {
    const [pages] = await database.query("SELECT content FROM pages WHERE id = ?", [req.query.id]) as [Page[], any];

    res.send(pages[0].content)
  } catch (error) {
    req.logger.error(error);
    res.sendStatus(500);
    return;
  }
});

export default router;
