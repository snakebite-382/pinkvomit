import Joi from "joi";

export interface ServiceError {
  error: Error | Joi.ValidationError,
  serverError: boolean;
}
