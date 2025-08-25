const Migration = require('mysql2-migration/lib/Migration')
const timestamps = require("../fix.js");

module.exports = new class extends Migration {
  up = async () => {
    return await this.createTable('comments',
      this.id(),
      this.unsignedBigInt("postID").notNull(),
      this.unsignedBigInt("blogID").notNull(),
      this.string("content", 1024).notNull(),
      this.foreign("postID").references("id").on("posts").onDelete("cascade"),
      this.foreign("blogID").references("id").on("blogs").onDelete("cascade"),
      timestamps()
    )
  }

  down = async () => {
    return await this.dropTable('comments')
  }
}
