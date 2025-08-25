import { User, DecodedJWT, Blog } from '../../types.ts';

declare global {
  namespace Express {
    interface Request {
      user?: User | null,
      token?: DecodedJWT | null,
      authed?: boolean,
      blogs?: Blog[],
      selectedBlog?: Blog | null
    }
  }
}
