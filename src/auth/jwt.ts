import { DecodedJWT } from "../types";

import jsonwebtoken from "jsonwebtoken";

const jwtSecret: string | undefined = process.env.jwtsecret || "";

if (!jwtSecret) {
  throw new Error("Missing jwtsecret in environment variables");
}

const signer = {
  sign: (token: Object): string => {
    return jsonwebtoken.sign(token, jwtSecret);
  },


  verify<T>(token: string): T | string {
    return jsonwebtoken.verify(token, jwtSecret) as T | string;
  },

  decode<T>(token: string): T | null {
    return jsonwebtoken.decode(token) as T | null;
  }
}

export default signer;
