const Migration = require('mysql2-migration/lib/Migration')

module.exports = new class extends Migration {
  up = async () => {
    return await this.
      string("atBlog", 256)
      .notNull()
      .foreign("at_blog").references("title").on("blogs").onDelete("cascade")
      .addColumn('replies')
  }

  down = async () => {
    return await this.dropColumn('replies', 'at_blog')
  }
}
