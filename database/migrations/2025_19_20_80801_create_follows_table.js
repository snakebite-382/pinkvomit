const Migration = require('mysql2-migration/lib/Migration')
const timestamps = require("../fix.js");

module.exports = new class extends Migration {
  up = async () => {
    return await this.createTable('follows',
      this.id(),
      this.unsignedBigInt("following_blogID").notNull(),
      this.unsignedBigInt("followed_blogID").notNull(),
      this.foreign("followed_blogID").references("id").on("blogs").onDelete("cascade"),
      this.foreign("following_blogID").references("id").on("blogs").onDelete("cascade"),
      timestamps()
    )
  }

  down = async () => {
    return await this.dropTable('follows')
  }
}
