const Migration = require('mysql2-migration/lib/Migration')
const timestamps = require('../fix.js');

module.exports = new class extends Migration {
  up = async () => {
    return await this.createTable('sessions',
      this.id(),
      'uuid CHAR(36) NOT NULL',
      this.unsignedBigInt('userID').notNull(),
      this.unsignedBigInt('expiresAt').notNull(),
      this.unsignedBigInt('selectedBlogID'),
      this.foreign("userID").references("id").on("users").onDelete('cascade'),
      this.foreign("selectedBlogID").references('id').on("blogs").onDelete('cascade'),
      timestamps()
    )
  }

  down = async () => {
    return await this.dropTable('sessions')
  }
}
