import { useEffect, useEffectEvent, useState } from "react";

type Settled<T> = { key: string; data: T | null; error: string | null };

/**
 * Runs an async read whenever `key` changes and exposes data/error/loading
 * plus a retry. While a new key loads, the previous data stays visible.
 */
export function useAsync<T>(load: () => Promise<T>, key: string, message = "We couldn't load this. Please try again.") {
  const [attempt, setAttempt] = useState(0);
  const current = `${key}#${attempt}`;
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const run = useEffectEvent(load);

  useEffect(() => {
    let cancelled = false;
    run().then(
      (data) => !cancelled && setSettled({ key: current, data, error: null }),
      () => !cancelled && setSettled((s) => ({ key: current, data: s?.data ?? null, error: message })),
    );
    return () => {
      cancelled = true;
    };
  }, [current, message]);

  const loading = settled?.key !== current;
  return {
    data: settled?.data ?? null,
    error: loading ? null : (settled?.error ?? null),
    loading,
    retry: () => setAttempt((n) => n + 1),
  };
}
