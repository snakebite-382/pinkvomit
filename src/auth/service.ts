import { ID, User, Session } from "types";
import { SessionRepositoryInterface, UserRepositoryInterface } from "./repository";
import argon from "argon2";
import { ServiceError } from "src/service";
import { BlogsRepositoryInterface } from "src/blogs/repository";
import { BlogServiceInterface } from "src/blogs/service";

export interface UserServiceInterface {
  createUser(email: string, password: string): Promise<User | null>;
  setMainBlogID(userID: ID, blogID: ID): Promise<boolean>;
  getUserByID(userID: ID): Promise<User | null>;
  userExists(userID: ID): Promise<boolean>;
}


export class UserService implements UserServiceInterface {
  constructor(private userRepository: UserRepositoryInterface, private blogsRepo: BlogsRepositoryInterface) { }

  async createUser(email: string, password: string): Promise<User | null> {
    const errors: ServiceError[] = [];
    const emailUsed = await this.userRepository.findOne({ email: email });

    if (emailUsed) {
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

}

export class SessionService {
  constructor(private sessionRepository: SessionRepositoryInterface, private userService: UserServiceInterface, private blogService: BlogServiceInterface) {
  }

  async createSession(userID: ID, mainBlogID: ID): Promise<Session | null> {
    const user = await this.userService.getUserByID(userID);

    if (user === null) {
      throw new Error("User does not exist")
    }

    const ownsBlog = await this.blogService.userOwnsBlog(userID, mainBlogID);

    if (!ownsBlog) {
      throw new Error("User does not own blog");
    }

    const id = crypto.randomUUID();

    let session = {
      id: id,
      userID: userID,
      expiresAt: Date.now() + (2 * 60 * 60 * 1000),
      selectedBlogID: user.mainBlogID
    }

    return await this.sessionRepository.insert(session)
  }

  async selectBlog(sessionID: ID, userID: ID, blogID: ID): Promise<Session | null> {
    if (!(await this.userService.userExists(userID))) return null;

    const ownsBlog = await this.blogService.userOwnsBlog(userID, blogID);

    if (!ownsBlog) {
      throw new Error("User does not own blog");
    }

    return await this.sessionRepository.update(sessionID, { selectedBlogID: blogID });
  }
}
