import crypto from "crypto";
import { config } from "../config";

const DEFAULT_PEPPER = "cgs-ctf-flag-pepper-change-me";
const FLAG_PEPPER = process.env.FLAG_PEPPER || DEFAULT_PEPPER;

if (config.isProd && FLAG_PEPPER === DEFAULT_PEPPER) {
  throw new Error(
    "Refusing to start in production: FLAG_PEPPER is unset or still the committed default. " +
      "Generate a unique secret (e.g. `openssl rand -hex 32`) and set it in the .env file."
  );
}

/**
 * Canonical flag fingerprint: HMAC-SHA256 keyed with the FLAG_PEPPER.
 * HMAC is the correct keyed construction (resistant to length-extension and
 * prefix-chosen attacks) and always yields 64 hex chars, so downstream
 * constant-time comparisons never leak length information.
 */
export function hashFlag(flag: string): string {
  return crypto.createHmac("sha256", FLAG_PEPPER).update(flag).digest("hex");
}

/**
 * Legacy fingerprint scheme (sha256(flag + "::" + pepper)) kept ONLY so that
 * challenges created before the HMAC upgrade remain verifiable.
 */
export function legacyHashFlag(flag: string): string {
  return crypto.createHash("sha256").update(`${flag}::${FLAG_PEPPER}`).digest("hex");
}

/** True when FLAG_PEPPER is still the committed default (insecure). */
export function isDefaultFlagPepper(): boolean {
  return FLAG_PEPPER === DEFAULT_PEPPER;
}

/** Constant-time comparison of two hex fingerprints (equal-length buffers). */
export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verify a submitted flag against a stored fingerprint. Accepts both the
 * current HMAC scheme and the legacy scheme so existing challenges keep
 * working after an upgrade.
 */
export function verifyFlag(flag: string, storedHash: string): boolean {
  if (timingSafeEqual(hashFlag(flag), storedHash)) return true;
  return timingSafeEqual(legacyHashFlag(flag), storedHash);
}

/** Official flag format: CGS{...} */
export const FLAG_FORMAT_REGEX = /^CGS\{.+\}$/;

export function isValidFlagFormat(flag: string): boolean {
  return FLAG_FORMAT_REGEX.test(flag.trim());
}

/**
 * Unpredictable delay (default 250–450 ms) applied on incorrect submissions
 * to neutralise timing oracles and materially slow automated flag guessing,
 * on top of the sliding-window submission guard.
 */
export function jitterDelay(minMs = 250, maxMs = 450): Promise<void> {
  const delay = minMs + crypto.randomInt(0, Math.max(1, maxMs - minMs));
  return new Promise((resolve) => setTimeout(resolve, delay));
}

export function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function generateToken(byteLength = 32): string {
  return crypto.randomBytes(byteLength).toString("hex");
}