import { ID, Post } from 'types';
import { PostsRepositoryInterface } from './repository';
import { BlogServiceInterface } from 'src/blogs/service';

export interface PostServiceInterface {
  createPost(content: string, blogID: ID, userID: ID): Promise<Post | null>
}

export class PostService {
  constructor(private postsRepository: PostsRepositoryInterface, private blogService: BlogServiceInterface) { }

  async createPost(content: string, blogID: ID, userID: ID) {
    if (!(await this.blogService.userOwnsBlog(blogID, userID))) return null;
    const id = crypto.randomUUID();
    return await this.postsRepository.insert({ id, blogID: blogID, content });
  }
}
