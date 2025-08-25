const Migration = require('mysql2-migration/lib/Migration')
const timestamps = require("../fix.js")

module.exports = new class extends Migration {
  up = async () => {
    return await this.createTable('pages',
      this.id(),
      this.unsignedBigInt("blogID").notNull(),
      this.string("title", 32).notNull(),
      this.string("content", 8192).notNull(),
      timestamps(),
    )
  }

  down = async () => {
    return await this.dropTable('pages')
  }
}
