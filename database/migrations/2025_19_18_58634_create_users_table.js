const Migration = require('mysql2-migration/lib/Migration')
const timestamps = require('../fix.js');
const uuids = require("../uuids.js");

module.exports = new class extends Migration {
  up = async () => {
    return await this.createTable('users',
      this.string('email', 256).notNull(),
      this.bool('emailVerified').default(0),
      this.string('password', 256).notNull(),
      uuids(),
      timestamps()
    )
  }

  down = async () => {
    return await this.dropTable('users')
  }
}
