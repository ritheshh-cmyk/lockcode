/**
 * Live Watcher & Client Presence Registry
 * Tracks active clients in real-time and provides chaos engineering test triggers.
 */

// In-memory client presence map: reg_key -> last query epoch ms
const activeClients = new Map<string, number>();

// In-memory chaos test mock: providerId -> expiration epoch ms
const simulatedFailures = new Map<string, number>();

/** Record that a client key just executed a query */
export function touchClientActivity(regKey: string): void {
  if (!regKey || regKey === "anonymous") return;
  activeClients.set(regKey, Date.now());
}

/** Check if a client has been active within the given window (default: 5 minutes) */
export function isClientActive(regKey: string, windowMs = 5 * 60 * 1000): boolean {
  const lastSeen = activeClients.get(regKey);
  if (!lastSeen) return false;
  return Date.now() - lastSeen < windowMs;
}

/** Get presence statistics across all known clients */
export function getClientPresenceSummary(): {
  activeNow: string[]; // last 5 minutes
  activeToday: string[]; // last 24 hours
  totalSeen: number;
} {
  const now = Date.now();
  const fiveMinAgo = now - 5 * 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const activeNow: string[] = [];
  const activeToday: string[] = [];

  for (const [key, ts] of activeClients.entries()) {
    if (ts > fiveMinAgo) activeNow.push(key);
    if (ts > oneDayAgo) activeToday.push(key);
  }

  return {
    activeNow,
    activeToday,
    totalSeen: activeClients.size,
  };
}

/** Simulate a temporary provider outage (Chaos Testing) */
export function triggerSimulatedFailure(providerId: string, durationMs = 60_000): void {
  simulatedFailures.set(providerId, Date.now() + durationMs);
}

/** Check if a provider has an active simulated outage */
export function isSimulatedFailure(providerId: string): boolean {
  const expireTime = simulatedFailures.get(providerId);
  if (!expireTime) return false;
  if (Date.now() > expireTime) {
    simulatedFailures.delete(providerId);
    return false;
  }
  return true;
}
