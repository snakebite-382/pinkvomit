const Migration = require('mysql2-migration/lib/Migration')
const timestamps = require("../fix.js");
const uuids = require("../uuids.js");
const foreignKey = require("../foreignKey.js");

module.exports = new class extends Migration {
  up = async () => {
    return await this.createTable('likes',
      foreignKey("blogID"),
      foreignKey("postID"),
      this.foreign("blogID").references("id").on("blogs").onDelete("cascade"),
      this.foreign("postID").references("id").on("posts").onDelete("cascade"),
      uuids(),
      timestamps()
    )
  }

  down = async () => {
    return await this.dropTable('likes')
  }
}
