const Migration = require('mysql2-migration/lib/Migration')

module.exports = new class extends Migration {
  up = async () => {
    return await this
      .unsignedBigInt("mainBlogID")
      .foreign("mainBlogID")
      .references("id")
      .on("blogs")
      .onDelete("cascade")
      .addColumn('users')
  }

  down = async () => {
    return await this.dropColumn('users', 'mainBlogID')
  }
}
