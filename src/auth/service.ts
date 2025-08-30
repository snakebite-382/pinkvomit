import { ID, User, Session } from "types";
import { SessionRepositoryInterface, UserRepositoryInterface } from "./repository";
import argon from "argon2";
import { ServiceError } from "src/service";
import { BlogRepositoryInterface } from "src/blogs/repository";
import database from "../database";
import { error } from "console";
import { getSessionExpiry } from "./middleware";
import { Primitives } from "joi";

export interface UserServiceInterface {
  createUser(email: string, password: string): Promise<User | null>;
  setMainBlogID(userID: ID, blogID: ID): Promise<boolean>;
  getUserByID(userID: ID): Promise<User | null>;
  getUser(email: string): Promise<User | null>;
  userExists(userID: ID): Promise<boolean>;
  emailInUse(email: string): Promise<boolean>;
}


export class UserService implements UserServiceInterface {
  constructor(private userRepository: UserRepositoryInterface, private blogsRepo: BlogRepositoryInterface) { }

  async createUser(email: string, password: string): Promise<User | null> {
    const errors: ServiceError[] = [];

    if (await this.emailInUse(email)) {
      throw new Error("Email already in use");
    }

    const hashedPassword = await argon.hash(password);

    if (errors.length > 0) {
      return null;
    }

    let user = {
      email: email,
      password: hashedPassword,
      id: crypto.randomUUID(),
    }

    let newUser = await this.userRepository.insert(user);

    return newUser || null;
  }

  async setMainBlogID(userID: ID, blogID: ID): Promise<boolean> {
    const blog = await this.blogsRepo.findOne({ id: blogID, userID })

    if (blog === null) {
      throw new Error("blog does not exist ")
    }

    let user = this.userRepository.update(userID, { mainBlogID: blog.id })

    return user !== null;
  }

  async getUserByID(userID: ID): Promise<User | null> {
    return this.userRepository.findOne({ id: userID });
  }

  async userExists(userID: ID): Promise<boolean> {
    return (await this.getUserByID(userID)) !== null;
  }

  async emailInUse(email: string) {
    const user = this.userRepository.findOne({ email });
    return user !== null;
  }

  async getUser(email: string) {
    return await this.userRepository.findOne({ email });
  }
}


export interface SessionServiceInterface {
  createSession(userID: ID, mainBlogID: ID, expires: Date): Promise<Session | null>
  selectBlog(sessionID: ID, userID: ID, blogID: ID): Promise<Session | null>
  deleteSession(sessionID: ID, userID: ID): Promise<boolean>
  getSession(sessionID: ID): Promise<Session | null>
  rotate(sessionID: ID, userID: ID, expires: Date): Promise<Session>
}

export class SessionService implements SessionServiceInterface {
  constructor(private sessionRepository: SessionRepositoryInterface, private userRepo: UserRepositoryInterface, private blogsRepo: BlogRepositoryInterface) {
  }

  async createSession(userID: ID, mainBlogID: ID | null, expires: Date): Promise<Session | null> {
    const user = await this.userRepo.findOne({ id: userID });

    if (user === null) {
      throw new Error("User does not exist")
    }

    if (mainBlogID !== null) {
      const ownsBlog = await this.blogsRepo.findOne({ userID, id: mainBlogID });

      if (ownsBlog === null) {
        throw new Error("User does not own blog");
      }
    }

    const id = crypto.randomUUID();

    let session = {
      id: id,
      userID: userID,
      expiresAt: expires, // session tokens expire every 15 minites;
      selectedBlogID: user.mainBlogID
    }

    return await this.sessionRepository.insert(session)
  }

  async selectBlog(sessionID: ID, userID: ID, blogID: ID): Promise<Session | null> {
    if ((await this.userRepo.findOne({ id: userID })) === null) return null;

    const ownsBlog = await this.blogsRepo.findOne({ userID, id: blogID });

    if (ownsBlog === null) {
      throw new Error("User does not own blog");
    }

    const ownsSession = await this.sessionRepository.findOne({ id: sessionID, userID });

    if (ownsSession === null) {
      throw new Error("User does not own session");
    }

    return await this.sessionRepository.update(sessionID, { selectedBlogID: blogID });
  }

  async deleteSession(sessionID: ID, userID: ID) {
    const ownsSession = await this.sessionRepository.findOne({ id: sessionID, userID });
    if (ownsSession === null) {
      throw new Error("User does not own session");
    }
    return await this.sessionRepository.delete(sessionID);
  }

  async getSession(sessionID: ID) {
    return await this.sessionRepository.findOne({ id: sessionID });
  }

  async rotate(sessionID: ID, userID: ID, expires: Date): Promise<Session> {
    const connection = await database.getConnection();
    try {
      connection.beginTransaction();
      this.sessionRepository.setConnection(connection);

      await this.deleteSession(sessionID, userID);
      const user = await this.userRepo.findOne({ id: userID });

      if (user === null) {
        throw new Error("User does not exist");
      }

      const session = await this.createSession(userID, user.mainBlogID, expires);

      if (session === null) {
        throw new Error("Couldn't create session");
      }

      connection.commit();
      this.sessionRepository.setConnection(database);

      return session;
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  }
}
