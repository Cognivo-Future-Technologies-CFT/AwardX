import { useCallback, useRef } from 'react';

/** ponytail: sync ref lock — blocks double-clicks before React re-renders disabled state */
export function useRequestLock() {
  const running = useRef(false);
  return useCallback(async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (running.current) return undefined;
    running.current = true;
    try {
      return await fn();
    } finally {
      running.current = false;
    }
  }, []);
}
