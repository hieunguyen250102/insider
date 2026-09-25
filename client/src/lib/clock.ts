/**
 * Countdowns are set by the server clock. Every snapshot carries the server's
 * `now`, so we keep the offset and read deadlines in server time.
 */

import { useEffect, useState } from 'react';

let offset = 0;

export function syncClock(serverNow: number): void {
  offset = serverNow - Date.now();
}

export function serverTime(): number {
  return Date.now() + offset;
}

/** Milliseconds left until `deadline`, re-rendering a few times a second. */
export function useRemaining(deadline: number | null | undefined, everyMs = 250): number {
  const [, force] = useState(0);
  useEffect(() => {
    if (!deadline) return;
    const t = setInterval(() => force((n) => n + 1), everyMs);
    return () => clearInterval(t);
  }, [deadline, everyMs]);
  return deadline ? Math.max(0, deadline - serverTime()) : 0;
}

/** Milliseconds since `start` in server time, re-rendering while active. */
export function useElapsed(start: number | null | undefined, active = true, everyMs = 200): number {
  const [, force] = useState(0);
  useEffect(() => {
    if (!start || !active) return;
    const t = setInterval(() => force((n) => n + 1), everyMs);
    return () => clearInterval(t);
  }, [start, active, everyMs]);
  return start ? Math.max(0, serverTime() - start) : 0;
}

export function mmss(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}
