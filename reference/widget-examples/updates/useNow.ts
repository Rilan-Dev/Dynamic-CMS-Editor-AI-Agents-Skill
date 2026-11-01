"use client";

import { useEffect, useState } from "react";

const MINUTE_MS = 60_000;

/**
 * The current time — but `null` during SSR and the first client render.
 *
 * The feed is statically rendered, so anything computed from "now" at
 * build time ("3h ago", "Today") would be wrong by the time a visitor reads
 * it and would mismatch the client's first render. Callers show absolute
 * dates while this is null and switch to relative wording once mounted.
 * Refreshes every minute so "just now" keeps ageing on an open tab.
 */
export function useNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), MINUTE_MS);
    return () => clearInterval(timer);
  }, []);

  return now;
}
