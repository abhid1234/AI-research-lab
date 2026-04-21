// Chain-based throttle: serializes calls through a single promise chain so
// callers using `Promise.all(calls.map(throttle))` end up effectively sequential.
// MIN_API_GAP_MS env var sets minimum gap between *starts* of throttled calls.
// 0 (default) disables throttling for full-tier providers.

const MIN_GAP_MS = Number(process.env.MIN_API_GAP_MS ?? 0);

let chain: Promise<unknown> = Promise.resolve();
let lastStart = 0;

export async function throttle<T>(fn: () => Promise<T>): Promise<T> {
  if (MIN_GAP_MS <= 0) return fn();

  const next = chain.then(async () => {
    const wait = Math.max(0, lastStart + MIN_GAP_MS - Date.now());
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastStart = Date.now();
    return fn();
  });

  // Don't poison the chain on failure — next caller still queues
  chain = next.catch(() => undefined);
  return next as Promise<T>;
}
