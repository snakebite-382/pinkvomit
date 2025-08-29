import { Blog, ID } from "types";
import { BlogsRepositoryInterface } from "./repository";
import { UserServiceInterface } from "src/auth/service";

export interface BlogServiceInterface {
  createBlog(title: string, userID: ID): Promise<Blog | null>
  getBlogByID(blogID: ID): Promise<Blog | null>
  getBlog(blogID: ID, userID: ID): Promise<Blog | null>
  userOwnsBlog(blogID: ID, userID: ID): Promise<boolean>
}

export class BlogService implements BlogServiceInterface {
  constructor(private blogsRepository: BlogsRepositoryInterface, private usersService: UserServiceInterface) { }

  async createBlog(title: string, userID: ID) {
    if (!(await this.usersService.userExists(userID))) return null;

    return await this.blogsRepository.insert({ title, userID })
  }

  async getBlogByID(blogID: ID) {
    return await this.blogsRepository.findOne({ id: blogID });
  }

  async getBlog(blogID: ID, userID: ID) {
    return await this.blogsRepository.findOne({ id: blogID, userID })
  }

  async userOwnsBlog(blogID: ID, userID: ID) {
    return (await this.getBlog(blogID, userID)) !== null;
  }
}
