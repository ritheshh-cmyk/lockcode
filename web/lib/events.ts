/**
 * Module-level SSE event bus for live activity stream.
 * In-memory subscriber registry across Node.js runtime instances.
 */

export interface LiveEvent {
  id: string;
  type: "query" | "error" | "provider_change" | "license_check";
  timestamp: string;
  provider?: string;
  model?: string;
  mode?: string;
  reg_key?: string;
  latency_ms?: number;
  tokens?: { prompt: number; completion: number; total: number };
  success?: boolean;
  error?: string;
  message?: string;
}

type Subscriber = (event: LiveEvent) => void;

// Module-level subscribers map
const subscribers = new Map<string, Subscriber>();

export function subscribe(id: string, cb: Subscriber): void {
  subscribers.set(id, cb);
}

export function unsubscribe(id: string): void {
  subscribers.delete(id);
}

export function broadcastEvent(event: LiveEvent): void {
  for (const cb of subscribers.values()) {
    try {
      cb(event);
    } catch {
      // Ignore dead subscriber callbacks
    }
  }
}

export function createEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
