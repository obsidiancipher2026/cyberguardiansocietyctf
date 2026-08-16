/**
 * Public realtime SSE client (unauthenticated push channel).
 * The backend broadcasts named events — `competition`, `scoreboard`,
 * `announcement` — plus unnamed `message` frames.
 */
export function connectRealtime(
  onEvent: (event: string, data: any) => void,
  onOpen?: () => void,
  onError?: (err: unknown) => void
) {
  if (typeof window === "undefined") return () => {};

  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
  const eventSource = new EventSource(`${base}/events/events`);

  eventSource.onopen = () => onOpen?.();
  eventSource.onerror = (e) => onError?.(e);
  eventSource.onmessage = (event) => {
    try {
      onEvent("message", JSON.parse(event.data));
    } catch {
      // ignore malformed frame
    }
  };
  for (const name of ["competition", "scoreboard", "announcement"]) {
    eventSource.addEventListener(name, (event) => {
      try {
        onEvent(name, JSON.parse((event as MessageEvent).data));
      } catch {
        // ignore malformed frame
      }
    });
  }

  return () => {
    eventSource.close();
  };
}

/** Legacy helper kept for callers that only need unnamed message frames. */
export function connectRealtimeTelemetry(onMessage: (data: any) => void) {
  return connectRealtime((event, data) => {
    if (event === "message") onMessage(data);
  });
}