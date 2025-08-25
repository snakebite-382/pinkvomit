import { DecodedJWT } from "../types";

const jsonwebtoken = require('jsonwebtoken');

const jwtSecret: string | undefined = process.env.jwtsecret || "";

if (!jwtSecret) {
  throw new Error("Missing jwtsecret in environment variables");
}

const signer = {
  sign: (token: Object): string => {
    return jsonwebtoken.sign(token, jwtSecret);
  },


  verify: (token: string): DecodedJWT | string => {
    return (jsonwebtoken.verify(token, jwtSecret));
  },

  decode: (token: string) => {
    return /**@type {DecodedJWT} */ (jsonwebtoken.decode(token));
  }
}

export default signer;
