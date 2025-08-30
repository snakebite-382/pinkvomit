import { parsePartial, Repository } from "src/repository";
import { ID, Session, User } from "types";
import database from "../database";
import { QueryOptions, ResultSetHeader } from "mysql2";
import { Connection, Pool } from "mysql2/promise";

export interface UserRepositoryInterface extends Repository<User> {
  insert(user: {
    id: ID,
    email: string,
    password: string
  }): Promise<User | null>;
  deleteByEmail(email: string): Promise<boolean>;
}

export class UserRepository implements UserRepositoryInterface {
  private readonly validFindValues = ["email", "id", "mainBlogID"]
  private readonly validUpdateValues = ["email", "password", "emailVerified", "mainBlogID"]
  private conn: Pool | Connection = database;

  setConnection(conn: Pool | Connection) {
    this.conn = conn;
  }

  async insert(user: User): Promise<User | null> {
    const [userInsert] = await this.conn.query<ResultSetHeader>("INSERT INTO users (id, email, password) VALUES (?, ?, ?)", [user.id, user.email, user.password]);
    return await this.findOne({ id: user.id });
  }

  async update(id: ID, user: Partial<User>, options: QueryOptions | {} = {}): Promise<User | null> {
    const { keyString, values } = parsePartial<User>(user, this.validUpdateValues, { ...options, joiner: ", " });

    const [result] = await this.conn.query<ResultSetHeader>(
      `UPDATE users SET ${keyString} WHERE id = ?`,
      [...values, id]
    );

    if (result.affectedRows === 0) {
      return null;
    }

    const [[updatedUser]] = await this.conn.query(
      "SELECT * FROM users WHERE id = ?",
      [id]
    ) as [User[], any];

    return updatedUser || null;
  }

  async delete(id: ID) {
    const [deleteUser] = await this.conn.query<ResultSetHeader>("DELETE FROM users WHERE id = ? ", id);

    return deleteUser.affectedRows > 0;
  }

  async find(user: Partial<User>, options: QueryOptions | {} = {}): Promise<User[] | null> {
    const { keyString, values } = parsePartial<User>(user, this.validFindValues, options);

    const [userResult] = await this.conn.query(`SELECT * FROM users WHERE ${keyString}`, [...values]) as [User[], any];

    return userResult.length > 0 ? userResult : null;
  }

  async findOne(user: Partial<User>, options: QueryOptions | {} = {}): Promise<User | null> {
    const userResult = await this.find(user, options);

    return userResult === null ? null : userResult[0];
  }

  async deleteByEmail(email: string): Promise<boolean> {
    const [deleteUser] = await this.conn.query<ResultSetHeader>("DELETE FROM users WHERE BINARY email = ?", email);

    return deleteUser.affectedRows > 0;
  }
}

export interface SessionRepositoryInterface extends Repository<Session> {
  insert(session: {
    id: ID,
    userID: ID
    selectedBlogID: ID | null,
    expiresAt: Date
  }): Promise<Session | null>
}

export class SessionRepository implements SessionRepositoryInterface {
  private readonly validFindValues = ["id", "userID"]
  private readonly validUpdateValues = ["selectedBlogID"]
  private conn: Pool | Connection = database;

  setConnection(conn: typeof this.conn) {
    this.conn = conn;
  }

  async insert(session: Session): Promise<Session | null> {
    await this.conn.query<ResultSetHeader>(`
      INSERT INTO sessions (id, userID, selectedBlogID, expiresAt) 
      VALUES (?, ?, ?, ?)`, [session.id, session.userID, session.selectedBlogID, session.expiresAt]);

    return await this.findOne(session);
  }

  async find(session: Partial<Session>, options: QueryOptions | {} = {}): Promise<Session[] | null> {
    const { keyString, values } = parsePartial<Session>(session, this.validFindValues, options)

    const [sessionResult] = await this.conn.query(`SELECT * FROM sessions WHERE ${keyString}`, [...values]) as [Session[], any];

    return sessionResult.length > 0 ? sessionResult : null;
  }

  async findOne(session: Partial<Session>, options: QueryOptions | {} = {}): Promise<Session | null> {
    const sessionResult = await this.find(session, options);

    return sessionResult === null ? null : sessionResult[0];
  }

  async update(id: ID, session: Partial<Session>, options: QueryOptions | {} = {}): Promise<Session | null> {
    const { keyString, values } = parsePartial<Session>(session, this.validUpdateValues, { ...options, joiner: ", " });

    const [updateResult] = await this.conn.query<ResultSetHeader>(`UPDATE sessions SET ${keyString} WHERE id = ?`, [...values, id]);

    if (updateResult.affectedRows === 0) {
      return null;
    }

    const [[updatedSession]] = await this.conn.query("SELECT * FROM sessions WHERE id = ?", [id]) as [Session[], any];

    return updatedSession || null;
  }

  async delete(id: ID): Promise<boolean> {
    const [deleteUser] = await this.conn.query<ResultSetHeader>("DELETE FROM sessions WHERE id = ?", [id]);

    return deleteUser.affectedRows > 0;
  }
}
