const Migration = require('mysql2-migration/lib/Migration')
const connection = require('mysql2-migration/lib/connection')

module.exports = new class extends Migration {
  up = async () => {
    return await connection.query("ALTER TABLE blogs ADD FULLTEXT fulltext_blogs_title (title);")
  }

  down = async () => {
    return await connection.query("ALTER TABLE blogs DROP INDEX fulltext_blogs_title;")
  }
}
