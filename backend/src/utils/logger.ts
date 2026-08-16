import winston from "winston";
import "winston-daily-rotate-file";
import fs from "fs";
import path from "path";
import { config } from "../config";

fs.mkdirSync(path.resolve(config.logDir), { recursive: true });

const redact = winston.format((info) => {
  const message = JSON.stringify(info);
  const sanitized = message
    .replace(/(password|passwordHash|token|tokenHash|secret|twoFASecret|authorization)["']?\s*[:=]\s*["'][^"']*["']/gi, "$1=[REDACTED]")
    .replace(/(?<="password":")[^"]*/gi, "[REDACTED]");
  if (sanitized !== message) {
    try {
      return JSON.parse(sanitized);
    } catch {
      return info;
    }
  }
  return info;
});

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      redact(),
      winston.format.colorize(),
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const suffix = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
        return `${timestamp} ${level}: ${message}${suffix}`;
      })
    ),
  }),
];

if (config.isProd) {
  transports.push(
    new winston.transports.DailyRotateFile({
      dirname: path.resolve(config.logDir),
      filename: "app-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "14d",
      format: winston.format.combine(redact(), winston.format.json()),
    })
  );
}

export const logger = winston.createLogger({
  level: config.isProd ? "info" : "debug",
  transports,
});
