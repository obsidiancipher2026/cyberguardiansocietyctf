import type { Response } from "express";

type Listener = (payload: unknown) => void;

/**
 * Admin-only realtime hub. Security alerts are broadcast here so they are
 * only visible to authenticated vault operators (never on the public stream).
 */
class AdminEventsHub {
  private clients = new Set<Response>();
  private listeners = new Map<string, Set<Listener>>();
  private maxClients = 50;

  connect(res: Response): boolean {
    if (this.clients.size >= this.maxClients) return false;
    this.clients.add(res);
    res.on("close", () => {
      this.clients.delete(res);
    });
    return true;
  }

  broadcast(event: string, payload: unknown): void {
    for (const client of this.clients) {
      try {
        client.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
      } catch {
        this.clients.delete(client);
      }
    }
    const subs = this.listeners.get(event);
    if (subs) for (const fn of subs) fn(payload);
  }

  on(event: string, fn: Listener): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(fn);
    return () => this.listeners.get(event)?.delete(fn);
  }

  clientCount(): number {
    return this.clients.size;
  }
}

export const adminEvents = new AdminEventsHub();
