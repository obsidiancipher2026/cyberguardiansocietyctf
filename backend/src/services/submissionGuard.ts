import { raiseAlert } from "./securityAlerts";

interface Bucket {
  window: number; // windowMs
  max: number; // max submissions per window
}

interface BlockRecord {
  key: string;
  until: number;
  reason: "user" | "ip";
  count: number;
  windowMs: number;
  blockedAt: number;
}

/**
 * Real, automated flag-submission throttling.
 *
 * A sliding window per user AND per source IP. When either exceeds the
 * configured limit, that entity is temporarily blocked from submitting.
 * Blocks are surfaced live to the admin panel and every block raises an
 * automated security alert (with deduplication) so staff are notified of
 * automated flag guessing.
 */
class SubmissionGuard {
  private userWindow: Bucket = { window: 15_000, max: 6 };
  private ipWindow: Bucket = { window: 15_000, max: 20 };

  private userHits = new Map<string, number[]>();
  private ipHits = new Map<string, number[]>();
  private blocks = new Map<string, BlockRecord>();

  private lastAlertAt = 0;

  updateLimits(partial: { windowMs?: number; maxPerUser?: number; maxPerIp?: number }) {
    if (partial.windowMs != null && partial.windowMs > 0) {
      this.userWindow.window = Math.floor(partial.windowMs);
      this.ipWindow.window = Math.floor(partial.windowMs);
    }
    if (partial.maxPerUser != null && partial.maxPerUser > 0) this.userWindow.max = Math.floor(partial.maxPerUser);
    if (partial.maxPerIp != null && partial.maxPerIp > 0) this.ipWindow.max = Math.floor(partial.maxPerIp);
    // Limit changes invalidate history so new limits apply immediately.
    this.userHits.clear();
    this.ipHits.clear();
    this.sweepBlocks();
  }

  limits() {
    return { windowMs: this.userWindow.window, maxPerUser: this.userWindow.max, maxPerIp: this.ipWindow.max };
  }

  private sweep(map: Map<string, number[]>, window: number, now: number): void {
    for (const [key, arr] of map) {
      const cutoff = now - window;
      const kept = arr.filter((t) => t > cutoff);
      if (kept.length === 0) map.delete(key);
      else map.set(key, kept);
    }
  }

  private sweepBlocks(): void {
    const now = Date.now();
    for (const [key, rec] of this.blocks) if (rec.until <= now) this.blocks.delete(key);
  }

  isBlocked(userKey: string, ip: string): BlockRecord | null {
    this.sweepBlocks();
    const now = Date.now();
    for (const key of [userKey, `ip:${ip}`]) {
      const rec = this.blocks.get(key);
      if (rec && rec.until > now) return rec;
    }
    return null;
  }

  /**
   * Record a submission attempt. Returns the active block if the entity is
   * now (or already) blocked. Raises a deduplicated alert on a fresh block.
   */
  record(userKey: string, ip: string): BlockRecord | null {
    const now = Date.now();
    this.sweepBlocks();

    const check = this.isBlocked(userKey, ip);
    if (check) return check;

    const userArr = this.userHits.get(userKey) ?? [];
    const ipArr = this.ipHits.get(ip) ?? [];

    const userCutoff = now - this.userWindow.window;
    const ipCutoff = now - this.ipWindow.window;

    userArr.push(now);
    ipArr.push(now);

    const userRecent = userArr.filter((t) => t > userCutoff);
    const ipRecent = ipArr.filter((t) => t > ipCutoff);

    this.userHits.set(userKey, userRecent);
    this.ipHits.set(ip, ipRecent);

    let block: BlockRecord | null = null;

    if (userRecent.length >= this.userWindow.max) {
      block = {
        key: userKey,
        until: now + this.userWindow.window * 4,
        reason: "user",
        count: userRecent.length,
        windowMs: this.userWindow.window,
        blockedAt: now,
      };
      this.blocks.set(userKey, block);
      this.userHits.delete(userKey);
    } else if (ipRecent.length >= this.ipWindow.max) {
      const ipKey = `ip:${ip}`;
      block = {
        key: ipKey,
        until: now + this.ipWindow.window * 4,
        reason: "ip",
        count: ipRecent.length,
        windowMs: this.ipWindow.window,
        blockedAt: now,
      };
      this.blocks.set(ipKey, block);
      this.ipHits.delete(ip);
    }

    if (block && now - this.lastAlertAt > 30_000) {
      this.lastAlertAt = now;
      raiseAlert({
        severity: "warning",
        category: "rate_limit",
        title: "Automated flag guessing detected",
        message: `Flag submission rate limit exceeded (${block.reason} block).`,
        details: {
          key: block.key,
          reason: block.reason,
          count: block.count,
          windowMs: block.windowMs,
          blockedUntil: new Date(block.until).toISOString(),
        },
      }).catch(() => {});
    }

    return block;
  }

  blocksSnapshot(): BlockRecord[] {
    this.sweepBlocks();
    return [...this.blocks.values()]
      .map((b) => ({ ...b, blockedUntil: new Date(b.until).toISOString(), blockedAtISO: new Date(b.blockedAt).toISOString() }))
      .sort((a, b) => b.blockedAt - a.blockedAt);
  }

  clearBlock(key: string): boolean {
    const removed = this.blocks.delete(key);
    this.userHits.delete(key);
    this.ipHits.delete(key.replace(/^ip:/, ""));
    return removed;
  }

  clearAll(): number {
    const n = this.blocks.size;
    this.blocks.clear();
    this.userHits.clear();
    this.ipHits.clear();
    return n;
  }
}

export const submissionGuard = new SubmissionGuard();
