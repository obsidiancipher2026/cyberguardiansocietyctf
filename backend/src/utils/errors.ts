import type { NextFunction, Request, Response } from "express";
import { API_ERROR_CODES, type ApiErrorCode } from "@cgs-ctf/shared";
import { config } from "../config";
import { logger } from "./logger";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: ApiErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function notFound(): HttpError {
  return new HttpError(404, API_ERROR_CODES.NOT_FOUND, "Not found");
}

export function unauthorized(message = "Authentication required"): HttpError {
  return new HttpError(401, API_ERROR_CODES.UNAUTHORIZED, message);
}

export function forbidden(message = "Forbidden"): HttpError {
  return new HttpError(403, API_ERROR_CODES.FORBIDDEN, message);
}

export function validationError(message: string, details?: unknown): HttpError {
  return new HttpError(400, API_ERROR_CODES.VALIDATION, message, details);
}

export function conflict(message: string): HttpError {
  return new HttpError(409, API_ERROR_CODES.CONFLICT, message);
}

export function rateLimited(message = "Too many requests"): HttpError {
  return new HttpError(429, API_ERROR_CODES.RATE_LIMITED, message);
}

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export function asyncHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: { code: API_ERROR_CODES.NOT_FOUND, message: "Not found" } });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
    return;
  }

  logger.error("Unhandled error", { path: req.path, message: (err as Error).message, stack: (err as Error).stack });

  if (config.nodeEnv === "development") {
    res.status(500).json({ error: { code: API_ERROR_CODES.INTERNAL, message: (err as Error).message } });
  } else {
    res.status(500).json({ error: { code: API_ERROR_CODES.INTERNAL, message: "Internal server error" } });
  }
}
