"use client";

import { useEffect } from "react";

// Keeps the screen on while `active`. The browser drops the lock whenever the
// tab is hidden, so it is requested again when the tab comes back.
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    async function acquire() {
      try {
        const next = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void next.release().catch(() => {});
          return;
        }
        sentinel = next;
      } catch {
        // Denied or unavailable: the screen may sleep, nothing else depends on it.
      }
    }

    function onVisible() {
      if (
        document.visibilityState === "visible" &&
        (!sentinel || sentinel.released)
      ) {
        void acquire();
      }
    }

    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release().catch(() => {});
    };
  }, [active]);
}
