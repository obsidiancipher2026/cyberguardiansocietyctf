import { raiseAlert } from "./securityAlerts";

interface BruteRecord {
  failures: number[];
  lastAlert: number;
}

/**
 * Brute-force detection for authentication endpoints (public users + admin
 * vault). Tracks failed attempts per identifier+IP in a sliding window and
 * raises an automated alert when the failure burst crosses a threshold.
 * The in-memory store is separate from the persistent lockout logic; its
 * only job is turning sustained guessing into a staff-visible alert.
 */
class BruteForceMonitor {
  private records = new Map<string, BruteRecord>();
  private windowMs = 10 * 60_000;
  private threshold = 5;
  private alertCooldownMs = 2 * 60_000;

  recordFailure(identifier: string, ip: string): void {
    const now = Date.now();
    const key = `${(identifier || "").toLowerCase()}|${ip}`;
    const rec = this.records.get(key) ?? { failures: [], lastAlert: 0 };
    rec.failures = rec.failures.filter((t) => t > now - this.windowMs);
    rec.failures.push(now);
    this.records.set(key, rec);

    if (rec.failures.length >= this.threshold && now - rec.lastAlert > this.alertCooldownMs) {
      rec.lastAlert = now;
      raiseAlert({
        severity: rec.failures.length >= this.threshold * 2 ? "critical" : "warning",
        category: "bruteforce",
        title: "Brute-force attack detected",
        message: `${rec.failures.length} failed logins for "${identifier}" from ${ip} in the last ${Math.round(this.windowMs / 60000)} minutes.`,
        details: { identifier, ip, failures: rec.failures.length, windowMs: this.windowMs },
      }).catch(() => {});
    }
  }

  clear(identifier: string, ip: string): void {
    this.records.delete(`${(identifier || "").toLowerCase()}|${ip}`);
  }
}

export const bruteForceMonitor = new BruteForceMonitor();
