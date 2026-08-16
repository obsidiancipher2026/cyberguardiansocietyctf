import { config } from "../config";

interface LockRecord {
  count: number;
  lockedUntil: number;
  lastAt: number;
}

/**
 * In-memory brute-force lockout store for the admin vault.
 * Tracks failed attempts per identifier+IP and per IP; a lock outlasts
 * the retry window so sustained brute forcing stays blocked.
 */
class AdminLockoutStore {
  private attempts = new Map<string, LockRecord>();
  private ips = new Map<string, LockRecord>();

  private sweep(): void {
    const now = Date.now();
    for (const [key, rec] of this.attempts) if (rec.lockedUntil + 24 * 60 * 60 * 1000 < now) this.attempts.delete(key);
    for (const [key, rec] of this.ips) if (rec.lockedUntil + 24 * 60 * 60 * 1000 < now) this.ips.delete(key);
  }

  private touch(map: Map<string, LockRecord>, key: string): LockRecord {
    const now = Date.now();
    const rec = map.get(key) ?? { count: 0, lockedUntil: 0, lastAt: 0 };
    if (rec.lockedUntil > now) return rec;
    if (now - rec.lastAt > config.admin.loginWindowMs) rec.count = 0;
    rec.lastAt = now;
    rec.count += 1;
    if (rec.count >= config.admin.loginMaxAttempts) rec.lockedUntil = now + config.admin.lockoutMs;
    map.set(key, rec);
    return rec;
  }

  recordFailure(identifier: string, ip: string): void {
    this.sweep();
    // Key the identifier counter by identifier+IP so an attacker rotating IPs
    // cannot remotely lock the admin account from many sources, while
    // same-IP brute forcing still trips the identifier lock.
    this.touch(this.attempts, `${identifier.toLowerCase()}|${ip}`);
    this.touch(this.ips, ip);
  }

  clear(identifier: string, ip: string): void {
    this.attempts.delete(`${identifier.toLowerCase()}|${ip}`);
    this.ips.delete(ip);
  }

  isLocked(identifier: string, ip: string): { locked: boolean; until: number } {
    this.sweep();
    const now = Date.now();
    for (const rec of [this.attempts.get(`${identifier.toLowerCase()}|${ip}`), this.ips.get(ip)]) {
      if (rec && rec.lockedUntil > now) return { locked: true, until: rec.lockedUntil };
    }
    return { locked: false, until: 0 };
  }

  snapshot(): { identifier: { key: string; count: number; lockedUntil: number }[]; ip: { key: string; count: number; lockedUntil: number }[] } {
    this.sweep();
    return {
      identifier: [...this.attempts.entries()].map(([key, rec]) => ({ key, count: rec.count, lockedUntil: rec.lockedUntil })),
      ip: [...this.ips.entries()].map(([key, rec]) => ({ key, count: rec.count, lockedUntil: rec.lockedUntil })),
    };
  }
}

export const adminLockout = new AdminLockoutStore();
