const Migration = require('mysql2-migration/lib/Migration')
const timestamps = require("../fix.js");
const uuids = require('../uuids.js');
const foreignKey = require("../foreignKey.js");

module.exports = new class extends Migration {
  up = async () => {
    return await this.createTable('replies',
      foreignKey("commentID"),
      foreignKey("blogID"),
      this.string("content", 1024).notNull(),
      this.foreign("commentID").references("id").on("comments").onDelete("cascade"),
      this.foreign("blogID").references("id").on("blogs").onDelete("cascade"),
      uuids(),
      timestamps()
    )
  }

  down = async () => {
    return await this.dropTable('replies')
  }
}
