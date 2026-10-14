"use client";

import { useMemo, useSyncExternalStore } from "react";
import { localISO, localMinutes, type ISODate } from "@/lib/dates";

export interface Now {
  date: ISODate;
  minutes: number;
}

const TICK_MS = 30_000;

function subscribe(listener: () => void): () => void {
  const id = window.setInterval(listener, TICK_MS);
  return () => window.clearInterval(id);
}

/** Current minute since the epoch. Stable between ticks, so renders stay cheap. */
const getMinute = (): number => Math.floor(Date.now() / 60_000);

/**
 * The user's current local date and minute, refreshed every 30 seconds.
 * Returns null on the server and during hydration, so markup never mismatches.
 */
export function useNow(): Now | null {
  const minute = useSyncExternalStore(subscribe, getMinute, () => 0);
  return useMemo(() => {
    if (minute === 0) return null;
    const d = new Date(minute * 60_000);
    return { date: localISO(d), minutes: localMinutes(d) };
  }, [minute]);
}
