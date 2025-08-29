import { ID, Post } from 'types';
import { QueryOptions, parsePartial, Repository } from '../repository';
import database from '../database';
import { ResultSetHeader } from 'mysql2';

export interface PostsRepositoryInterface extends Repository<Post> {
  insert(post: {
    id: ID,
    content: string,
    blogID: ID
  }): Promise<Post | null>
}

export class PostsRepository implements PostsRepositoryInterface {
  private readonly validFindValues = ["id, blogID"]

  async insert(post: Partial<Post>): Promise<Post | null> {
    const [postInsert] = await database.query<ResultSetHeader>("INSERT INTO posts (id, content, blogID) VALUES (?, ?, ?)",
      [post.id, post.content, post.blogID]);
    return this.findOne({ id: post.id });
  }

  async findOne(post: Partial<Post>, options: QueryOptions | {} = {}): Promise<Post | null> {
    const postResult = await this.find(post, options)
    return postResult === null ? null : postResult[0];
  }

  async find(post: Partial<Post>, options: QueryOptions | {} = {}) {
    const { keyString, values } = parsePartial<Post>(post, this.validFindValues, options);

    const [postResult] = await database.query(`SELECT * FROM posts WHERE ${keyString}`, [...values]) as [Post[], any]

    return postResult.length > 0 ? postResult : null;
  }

  async update(id: ID, post: Partial<Post>, options: QueryOptions | {} = {}): Promise<Post | null> {
    return null; // Posts cannot but updated
  }

  async delete(id: ID) {
    const [postDelete] = await database.query<ResultSetHeader>("DELETE FROM posts WHERE id = ? ", [id]);

    return postDelete.affectedRows > 0;
  }

}
