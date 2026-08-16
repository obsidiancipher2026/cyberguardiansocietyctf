import type { NextFunction, Request, Response } from "express";
import Joi from "joi";
import { validationError } from "../utils/errors";

// Shared passphrase policy mirroring the frontend strength rules: 8+ chars,
// no whitespace, at least one lowercase, one uppercase, one digit and one
// special character. Enforced server-side so weak passphrases cannot be
// submitted by bypassing the UI.
export const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/[a-z]/, "a lowercase letter")
  .pattern(/[A-Z]/, "an uppercase letter")
  .pattern(/\d/, "a number")
  .pattern(/[^A-Za-z0-9]/, "a special character")
  .pattern(/^[^\s]+$/, "no spaces")
  .messages({
    "string.min": "Passphrase must be at least {#limit} characters",
    "string.max": "Passphrase must be {#limit} characters or fewer",
    "string.pattern.name": "Passphrase must contain {#name}",
  });

export function validate(schema: Joi.ObjectSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const target = {
      ...(req.query ?? {}),
      ...(req.params ?? {}),
      ...(req.body ?? {}),
    };

    const { error, value } = schema.validate(target, { abortEarly: false, stripUnknown: true });
    if (error) {
      next(validationError("Validation failed", error.details.map((d) => d.message)));
      return;
    }

    if (req.body && typeof req.body === "object" && Object.keys(req.body).length > 0) {
      const newBody: Record<string, unknown> = {};
      for (const key of Object.keys(value)) {
        if (!(req.params && key in req.params) && !(req.query && key in req.query)) {
          newBody[key] = value[key];
        } else if (req.body && key in req.body) {
          newBody[key] = value[key];
        }
      }
      req.body = newBody;
    }

    next();
  };
}
