// json web tokens are a secure way to store data while using cryptography to verify that data
// basically you take a JSON object and sign it with cryptography
// anyone can read the contents but to verify or sign tokens you need the secret key
// we will basically just store some basic info about a logged in user in json, sign that 
// and let them keep the token, they'll send it as a cookie with their requests and we can check it with middleware
// to verify they're logged in and get secure info about their user without doing a db query every time


const signer = {
  sign: (token) => {
    return require("jsonwebtoken").sign(token, process.env.jwtsecret);
  },

  verify: (token) => {
    return require("jsonwebtoken").verify(token, process.env.jwtsecret);
  },

  decode: (token) => {
    return require("jsonwebtoken").decode(token, process.env.jwtsecret);
  }
}

module.exports = signer;
