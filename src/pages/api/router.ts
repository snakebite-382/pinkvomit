import express from "express";
import { protect } from "src/auth/middleware";
import { renderPage } from "../page";
const router = express.Router();

router.post("/preview", protect(), async (req, res) => {
  const [output, errors] = await renderPage(req.body.content, req.body.blogTitle, false);
  res.send(`
    <div id="preview-result">
      ${output}
      <div id="preview-errors">
        ${errors.length === 0 ? "" : errors.map(error => `<div class="error">${error}</div>`)}
      </div>
    </div>`);
})

export default router;
