import insane from 'insane';
import Joi from 'joi';


export const userValidator = Joi.object({
  email: Joi.string()
    .email({ minDomainSegments: 2, tlds: { allow: ["com", "net"] } })
    .trim()
    .optional(),

  password: Joi.string()
    .pattern(
      new RegExp("^(?=.*[A-Za-z])(?=.*\\d)(?=.*[@$!%*#?&])[A-Za-z\\d@$!%*#?&]{8,}$"),
      "Password complexity"
    )
    .min(8)
    .max(128)
    .trim()
    .messages({
      "string.pattern.name": "Password must have at least one letter, one number, and one special character",
      "string.min": "Password must be at least 8 characters",
      "string.max": "Password can be max 128 characters",
    })
    .optional(),

  confirm_password: Joi.any()
    .valid(Joi.ref("password"))
    .required()
    .messages({ "any.only": "Passwords must match" })
    .optional(),
});

export const titleValidator = Joi.string().alphanum().min(3).max(32).trim();
export const contentValidator = Joi.string().min(3).max(8192).trim();

export const blogValidator = Joi.object({
  title: titleValidator.optional(),
  stylesheet: Joi.string().min(0).max(65535).trim().optional()
})

export const pageValidator = Joi.object({
  title: titleValidator.optional(),
  content: contentValidator.optional()
})


export function sanitizeInput(source: string): string {
  return insane(source, { allowedTags: [] }); // take input and strip any html elements
}
