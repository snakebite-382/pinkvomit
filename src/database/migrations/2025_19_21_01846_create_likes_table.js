const Migration = require('mysql2-migration/lib/Migration')
const timestamps = require("../fix.js");

module.exports = new class extends Migration {
  up = async () => {
    return await this.createTable('likes',
      this.id(),
      this.unsignedBigInt("blogID").notNull(),
      this.unsignedBigInt("postID").notNull(),
      this.foreign("blogID").references("id").on("blogs").onDelete("cascade"),
      this.foreign("postID").references("id").on("posts").onDelete("cascade"),
      timestamps()
    )
  }

  down = async () => {
    return await this.dropTable('likes')
  }
}
