// Tiny localStorage-backed store for useSyncExternalStore. Survives private
// mode / blocked storage (falls back to memory) and syncs across tabs.

export type LocalStore<T> = {
  get: () => T;
  set: (value: T) => void;
  subscribe: (listener: () => void) => () => void;
  /** Stable value used during SSR and before hydration. */
  serverSnapshot: () => T;
};

export function createLocalStore<T>(key: string, fallback: T, validate: (raw: unknown) => T): LocalStore<T> {
  let cache: T | undefined;
  const listeners = new Set<() => void>();

  const get = () => {
    if (cache !== undefined) return cache;
    try {
      const raw = window.localStorage.getItem(key);
      cache = raw ? validate(JSON.parse(raw)) : fallback;
    } catch {
      cache = fallback;
    }
    return cache;
  };

  const set = (value: T) => {
    cache = value;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage unavailable: keep the in-memory value for this tab.
    }
    listeners.forEach((l) => l());
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) {
        cache = undefined;
        listener();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  };

  return { get, set, subscribe, serverSnapshot: () => fallback };
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
