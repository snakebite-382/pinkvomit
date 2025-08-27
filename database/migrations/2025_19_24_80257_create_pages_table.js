const Migration = require('mysql2-migration/lib/Migration')
const timestamps = require("../fix.js")
const uuids = require("../uuids.js");
const foreignKey = require("../foreignKey.js");

module.exports = new class extends Migration {
  up = async () => {
    return await this.createTable('pages',
      foreignKey("blogID"),
      this.string("title", 32).notNull(),
      this.string("content", 8192).notNull(),
      this.foreign("blogID").references("id").on("blogs").onDelete("cascade"),
      uuids(),
      timestamps(),
    )
  }

  down = async () => {
    return await this.dropTable('pages')
  }
}
