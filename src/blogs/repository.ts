import { parsePartial, QueryOptions, Repository } from "src/repository";
import { Blog, ID } from "types";
import database from "../database";
import { ResultSetHeader } from "mysql2";

export interface BlogsRepositoryInterface extends Repository<Blog> {

}

export class BlogsRepository implements BlogsRepositoryInterface {
  private readonly validFindValues = ["id", "userID", "title"];
  private readonly validUpdateValues = ["title", "stylesheet"];

  async insert(blog: Blog): Promise<Blog | null> {
    await database.query("INSERT INTO blogs (id, title, userID) VALUES (?, ?, ?)", [blog.id, blog.title, blog.userID]);

    return await this.findOne(blog);
  }

  async find(blog: Partial<Blog>, options: QueryOptions | {} = {}): Promise<Blog[] | null> {
    const { keyString, values } = parsePartial<Blog>(blog, this.validFindValues, options);

    const [blogResult] = await database.query(`SELECT * FROM blogs WHERE ${keyString}`, [...values]) as [Blog[], any]

    return blogResult.length > 0 ? blogResult : null;
  }

  async findOne(blog: Partial<Blog>, options: QueryOptions | {} = {}): Promise<Blog | null> {
    const blogs = await this.find(blog, options);

    return blogs === null ? null : blogs[0];
  }

  async delete(id: ID): Promise<boolean> {
    const [deleteBlog] = await database.query<ResultSetHeader>("DELETE FROM blogs WHERE id = ?", [id]);

    return deleteBlog.affectedRows > 0;
  }

  async update(id: ID, blog: Partial<Blog>, options: QueryOptions | {} = {}): Promise<Blog | null> {
    const { keyString, values } = parsePartial<Blog>(blog, this.validUpdateValues, { ...options, joiner: ", " });

    const [updateBlog] = await database.query<ResultSetHeader>(`UPDATE blogs SET ${keyString} WHERE id = ?`, [...values, id]);

    if (updateBlog.affectedRows === 0) {
      return null;
    }

    const [[resultBlog]] = await database.query(`SELECT * FROM blogs WHERE id = ?`, [id]) as [Blog[], any];

    return resultBlog || null;
  }
}
