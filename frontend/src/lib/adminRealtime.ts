import { ADMIN_SLUG, getAdminToken } from "./adminConfig";

/**
 * Authenticated SSE client for the admin-only security event stream.
 * EventSource cannot set the vault header / bearer token, so we read the
 * stream via fetch + ReadableStream and parse SSE frames manually.
 */
export function connectAdminEvents(onEvent: (event: string, data: any) => void, onOpen?: () => void, onError?: (err: unknown) => void) {
  if (typeof window === "undefined") return () => {};

  let closed = false;
  let controller: AbortController | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

  async function connect() {
    if (closed) return;
    const token = getAdminToken();
    if (!token) {
      retryTimer = setTimeout(connect, 2000);
      return;
    }
    controller = new AbortController();
    try {
      const res = await fetch(`${base}/admin/security/stream`, {
        headers: {
          "x-cgs-vault": ADMIN_SLUG,
          authorization: `Bearer ${token}`,
          accept: "text/event-stream",
        },
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        throw new Error(`stream ${res.status}`);
      }
      onOpen?.();

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (!closed) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const raw = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          let event = "message";
          const dataLines: string[] = [];
          for (const line of raw.split("\n")) {
            if (line.startsWith("event:")) event = line.slice(6).trim();
            else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
            else if (line.startsWith(":")) continue;
          }
          if (dataLines.length) {
            try {
              onEvent(event, JSON.parse(dataLines.join("\n")));
            } catch {
              /* ignore malformed frame */
            }
          }
        }
      }
    } catch (err) {
      if (!closed) onError?.(err as Error);
    } finally {
      if (!closed) {
        retryTimer = setTimeout(connect, 4000);
      }
    }
  }

  connect();

  return () => {
    closed = true;
    if (retryTimer) clearTimeout(retryTimer);
    controller?.abort();
  };
}
