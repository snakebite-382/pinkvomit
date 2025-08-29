import { parsePartial, QueryOptions, Repository } from "../repository";
import { Page, ID } from "types";
import database from "../database";
import { ResultSetHeader } from "mysql2";

export interface PagesRepositoryInterface extends Repository<Page> {
  insert(page: { id: ID, content: string, title: string, blogID: ID }): Promise<Page | null>
}

export class PageRepository implements PagesRepositoryInterface {
  private readonly validFindValues = ["id", "blogID", "title"];
  private readonly validUpdateValues = ["content", "title"];

  async insert(page: Partial<Page>) {
    await database.query<ResultSetHeader>("INSERT INTO pages (id, title, content, blogID) VALUES (?, ?, ?, ?)", [page.id, page.title, page.content, page.blogID]);
    return await this.findOne({ id: page.id });
  }

  async findOne(page: Partial<Page>, options: QueryOptions | {} = {}) {
    const pages = await this.find(page, options);

    return pages !== null ? pages[0] : null;
  }

  async find(page: Partial<Page>, options: QueryOptions | {} = {}) {
    const { keyString, values } = parsePartial(page, this.validFindValues, options);
    const [pages] = await database.query(`SELECT * FROM pages WHERE ${keyString}`, [...values]) as [Page[], any];

    return pages.length > 0 ? pages : null;
  }

  async update(id: ID, page: Partial<Page>, options: QueryOptions | {} = {}) {
    const { keyString, values } = parsePartial(page, this.validUpdateValues, { ...options, joiner: ", " });
    const [pageUpate] = await database.query<ResultSetHeader>(`UPDATE pages SET ${keyString} WHERE id = ?`, [...values, id]);

    if (pageUpate.affectedRows === 0) return null;

    return this.findOne({ id });
  }

  async delete(id: ID) {
    const [pageDelete] = await database.query<ResultSetHeader>("DELETE FROM posts WHERE id = ? ", [id]);

    return pageDelete.affectedRows > 0;
  }
}
