const Migration = require('mysql2-migration/lib/Migration')
const timestamps = require("../fix.js");

module.exports = new class extends Migration {
  up = async () => {
    return await this.createTable('posts',
      this.id(),
      this.string("content", 8192).notNull(),
      this.unsignedBigInt("blogID").notNull(),
      this.foreign("blogID").references("id").on("blogs").onDelete("cascade"),
      timestamps()
    )
  }

  down = async () => {
    return await this.dropTable('posts')
  }
}
