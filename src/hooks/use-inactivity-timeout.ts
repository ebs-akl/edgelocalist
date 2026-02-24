import { useEffect, useRef, useCallback } from "react";

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
];

export function useInactivityTimeout(onTimeout: () => void, enabled: boolean) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(onTimeout, INACTIVITY_TIMEOUT_MS);
  }, [onTimeout]);

  useEffect(() => {
    if (!enabled) return;

    resetTimer();

    for (const event of ACTIVITY_EVENTS) {
      document.addEventListener(event, resetTimer, { passive: true });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const event of ACTIVITY_EVENTS) {
        document.removeEventListener(event, resetTimer);
      }
    };
  }, [enabled, resetTimer]);
}
