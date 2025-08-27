const Migration = require('mysql2-migration/lib/Migration')
const timestamps = require('../fix.js');
const uuids = require("../uuids.js");
const foreignKey = require("../foreignKey.js");

module.exports = new class extends Migration {
  up = async () => {
    return await this.createTable('sessions',
      foreignKey("userID"),
      foreignKey("selectedBlogID", true),
      this.unsignedBigInt('expiresAt').notNull(),
      this.foreign("userID").references("id").on("users").onDelete('cascade'),
      this.foreign("selectedBlogID").references('id').on("blogs").onDelete('cascade'),
      uuids(),
      timestamps()
    )
  }

  down = async () => {
    return await this.dropTable('sessions')
  }
}
