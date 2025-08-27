const Migration = require('mysql2-migration/lib/Migration')
const timestamps = require('../fix.js');
const uuids = require("../uuids.js")
const foreignKey = require("../foreignKey.js")

module.exports = new class extends Migration {
  up = async () => {
    return await this.createTable('blogs',
      foreignKey('userID'),
      this.string('title', 256).notNull(),
      this.text("stylesheet"),
      this.foreign('userID').references('id').on('users').onDelete('cascade'),
      this.unique("title"),
      uuids(),
      timestamps()
    )
  }

  down = async () => {
    return await this.dropTable('blogs')
  }
}
