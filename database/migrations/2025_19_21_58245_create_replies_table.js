const Migration = require('mysql2-migration/lib/Migration')
const timestamps = require("../fix.js");

module.exports = new class extends Migration {
  up = async () => {
    return await this.createTable('replies',
      this.id(),
      this.unsignedBigInt("commentID").notNull(),
      this.unsignedBigInt("blogID").notNull(),
      this.string("content", 1024).notNull(),
      this.foreign("commentID").references("id").on("comments").onDelete("cascade"),
      this.foreign("blogID").references("id").on("blogs").onDelete("cascade"),
      timestamps()
    )
  }

  down = async () => {
    return await this.dropTable('replies')
  }
}
