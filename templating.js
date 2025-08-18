const render = (req, res, name, title, vars = {}) => {
  vars.authed = req.authed;
  vars.token = req.token;
  vars.user = req.user;
  vars.blogs = req.blogs;
  vars.selectedBlog = req.selectedBlog;
  vars.title = title.toUpperCase();
  return res.render(name, vars);
}

module.exports = render;
