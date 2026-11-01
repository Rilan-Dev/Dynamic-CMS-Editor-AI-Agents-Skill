"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { unreadEntries, type UpdateEntry } from "./updatesModel";
import { useNow } from "./useNow";

const SEEN_KEY = "smts:updates:seen-at";
const SEEN_EVENT = "smts:updates-seen";

const readSeenAt = (): string | null => {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
};

/**
 * Which published updates this visitor has not seen yet.
 *
 * "Seen" is a per-browser timestamp set when /updates is opened (see
 * markSeen), shared across the navbar badge, the preview panel and the
 * announcement card through a window event. Like useNow, everything is
 * empty until mounted, so server and first client render always agree.
 */
export function useUpdatesSeen(entries: UpdateEntry[], freshnessDays: number) {
  const now = useNow();
  const [seenAt, setSeenAt] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSeenAt(readSeenAt());
    setLoaded(true);
    const sync = () => setSeenAt(readSeenAt());
    window.addEventListener(SEEN_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SEEN_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const unread = useMemo(
    () => (now && loaded ? unreadEntries(entries, seenAt, freshnessDays, now) : []),
    [entries, seenAt, freshnessDays, now, loaded],
  );
  const unreadIds = useMemo(() => new Set(unread.map((entry) => entry.id)), [unread]);

  const markSeen = useCallback(() => {
    try {
      localStorage.setItem(SEEN_KEY, new Date().toISOString());
    } catch {
      // Blocked storage: the badge simply keeps showing fresh updates.
    }
    window.dispatchEvent(new Event(SEEN_EVENT));
  }, []);

  return { unread, unreadIds, markSeen, now };
}
