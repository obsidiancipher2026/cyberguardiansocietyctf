/**
 * Deduplicated public API fetcher.
 *
 * Multiple components on the same page (MaintenanceGate, countdown, auth
 * shell) fetch identical public payloads on mount. This coalesces those
 * bursts into one in-flight request and serves a short-TTL cache, cutting
 * backend chatter on every page load without adding staleness risk.
 */

const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

const inflight = new Map<string, Promise<unknown>>();
const cache = new Map<string, { at: number; value: unknown }>();

const TTL_MS = 3_000;

export async function getPublicJson<T>(path: string): Promise<T | null> {
  const cached = cache.get(path);
  if (cached && Date.now() - cached.at < TTL_MS) {
    return cached.value as T | null;
  }

  let pending = inflight.get(path);
  if (!pending) {
    pending = fetch(`${base}${path}`, {
      cache: "no-store",
      headers: { accept: "application/json" },
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const data = (await res.json()) as T;
        cache.set(path, { at: Date.now(), value: data });
        return data;
      })
      .catch(() => null)
      .finally(() => {
        inflight.delete(path);
      });
    inflight.set(path, pending);
  }

  return (await pending) as T | null;
}