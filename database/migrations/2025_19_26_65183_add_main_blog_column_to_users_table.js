const Migration = require('mysql2-migration/lib/Migration')
const connection = require('mysql2-migration/lib/connection');

module.exports = new class extends Migration {
  up = async () => {
    return await connection.query(`ALTER TABLE users 
  ADD COLUMN mainBlogID CHAR(36),
  ADD CONSTRAINT fk_users_mainblogid 
  FOREIGN KEY (mainBlogID) REFERENCES blogs(id);`)
  }

  down = async () => {
    return await this.dropColumn('users', 'main_blog')
  }
}
