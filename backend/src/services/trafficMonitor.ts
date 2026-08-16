import { raiseAlert } from "./securityAlerts";

interface Sample {
  ts: number; // ms epoch
  path: string;
  status: number;
  ip: string;
  latency: number;
}

interface PathStat {
  path: string;
  count: number;
  errors: number;
  avgLatency: number;
}

/**
 * Real-time traffic analysis.
 *
 * Every API request is sampled by a middleware into a rolling buffer. The
 * monitor computes live RPS, a moving baseline, per-path and per-status
 * breakdowns, and raises automated alerts when:
 *  - request volume spikes well above the rolling baseline, or
 *  - the error ratio (4xx/5xx) jumps, or
 *  - a single source IP generates an unusual burst.
 */
class TrafficMonitor {
  private samples: Sample[] = [];
  private maxSamples = 40_000;
  private baselineMs = 5 * 60_000; // rolling baseline window

  private lastAlertAt = 0;

  record(sample: Sample): void {
    this.samples.push(sample);
    if (this.samples.length > this.maxSamples) {
      this.samples.splice(0, this.samples.length - this.maxSamples);
    }
  }

  private prune(now = Date.now()): void {
    const cutoff = now - this.baselineMs * 2;
    this.samples = this.samples.filter((s) => s.ts > cutoff);
  }

  /**
   * Called from middleware after response finishes. Runs cheap anomaly
   * detection inline on a throttled cadence.
   */
  analyze(now = Date.now()): void {
    if (now - this.lastAlertAt < 20_000) return;
    this.lastAlertAt = now;
    this.prune(now);

    const recentWindow = 15_000;
    const recent = this.samples.filter((s) => s.ts > now - recentWindow);
    const baseline = this.samples.filter((s) => s.ts > now - this.baselineMs && s.ts <= now - recentWindow);

    const recentRps = recent.length / (recentWindow / 1000);
    const baselineRps = baseline.length / ((this.baselineMs - recentWindow) / 1000);
    const minActivity = 5;

    if (baselineRps >= minActivity && recentRps > baselineRps * 6 && recentRps >= 20) {
      raiseAlert({
        severity: recentRps > baselineRps * 12 ? "critical" : "warning",
        category: "traffic",
        title: "Traffic spike detected",
        message: `Request rate jumped from ${baselineRps.toFixed(1)} to ${recentRps.toFixed(1)} req/s over the last 15s.`,
        details: { recentRps: Math.round(recentRps), baselineRps: Math.round(baselineRps * 10) / 10, windowMs: recentWindow },
      }).catch(() => {});
    }

    // Sudden error-ratio spike (excluding the usual 404s from probing).
    const errors = recent.filter((s) => s.status >= 400 && s.status !== 404);
    const errRatio = recent.length ? errors.length / recent.length : 0;
    if (recent.length >= 20 && errRatio >= 0.4) {
      raiseAlert({
        severity: "warning",
        category: "traffic",
        title: "High error ratio",
        message: `${Math.round(errRatio * 100)}% of the last ${recent.length} requests returned errors.`,
        details: { errorRatio: Math.round(errRatio * 100), samples: recent.length },
      }).catch(() => {});
    }

    // Single-IP burst — a common brute-force / scraping signature.
    const byIp = new Map<string, number>();
    for (const s of recent) byIp.set(s.ip, (byIp.get(s.ip) ?? 0) + 1);
    for (const [ip, count] of byIp) {
      if (count >= 40 && recent.length > count * 2) {
        raiseAlert({
          severity: "warning",
          category: "traffic",
          title: "Single source burst",
          message: `IP ${ip} issued ${count} requests in the last 15s.`,
          details: { ip, count, windowMs: recentWindow },
        }).catch(() => {});
        break;
      }
    }
  }

  snapshot(): {
    total: number;
    rps: { current: number; baseline: number };
    byStatus: { status: number; count: number }[];
    topPaths: PathStat[];
    topIps: { ip: string; count: number }[];
    windowSeconds: number;
  } {
    const now = Date.now();
    this.prune(now);
    const recentWindow = 15_000;
    const recent = this.samples.filter((s) => s.ts > now - recentWindow);
    const baseline = this.samples.filter((s) => s.ts > now - this.baselineMs);

    const byStatus = new Map<number, number>();
    for (const s of baseline) byStatus.set(s.status, (byStatus.get(s.status) ?? 0) + 1);

    const byPath = new Map<string, PathStat>();
    for (const s of baseline) {
      const cur = byPath.get(s.path) ?? { path: s.path, count: 0, errors: 0, avgLatency: 0 };
      cur.count += 1;
      if (s.status >= 400) cur.errors += 1;
      cur.avgLatency = (cur.avgLatency * (cur.count - 1) + s.latency) / cur.count;
      byPath.set(s.path, cur);
    }

    const byIp = new Map<string, number>();
    for (const s of baseline) byIp.set(s.ip, (byIp.get(s.ip) ?? 0) + 1);

    return {
      total: this.samples.length,
      rps: {
        current: Math.round((recent.length / (recentWindow / 1000)) * 10) / 10,
        baseline: Math.round((baseline.length / (this.baselineMs / 1000)) * 10) / 10,
      },
      byStatus: [...byStatus.entries()].map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count),
      topPaths: [...byPath.values()].sort((a, b) => b.count - a.count).slice(0, 12),
      topIps: [...byIp.entries()].map(([ip, count]) => ({ ip, count })).sort((a, b) => b.count - a.count).slice(0, 10),
      windowSeconds: Math.round(this.baselineMs / 1000),
    };
  }
}

export const trafficMonitor = new TrafficMonitor();
