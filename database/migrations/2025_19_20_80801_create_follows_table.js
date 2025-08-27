const Migration = require('mysql2-migration/lib/Migration')
const timestamps = require("../fix.js");
const uuids = require("../uuids.js");
const foreignKey = require("../foreignKey.js");

module.exports = new class extends Migration {
  up = async () => {
    return await this.createTable('follows',
      foreignKey("following_blogID"),
      foreignKey("followed_blogID"),
      this.foreign("followed_blogID").references("id").on("blogs").onDelete("cascade"),
      this.foreign("following_blogID").references("id").on("blogs").onDelete("cascade"),
      uuids(),
      timestamps()
    )
  }

  down = async () => {
    return await this.dropTable('follows')
  }
}
