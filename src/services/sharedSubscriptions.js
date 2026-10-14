// Ref-counted subscriptions. Entries (including cached values) vanish with the last consumer.
const entries = new Map();
export function subscribeShared(key, start, onData, onError = () => {}) {
  let entry = entries.get(key);
  const listener = { onData, onError };
  if (entry) {
    entry.listeners.add(listener);
    if (entry.hasValue) onData(entry.value);
  } else {
    entry = { listeners: new Set([listener]), hasValue: false, stop: () => {} };
    entries.set(key, entry);
    try {
      entry.stop =
        start(
          (value) => {
            entry.value = value;
            entry.hasValue = true;
            for (const item of entry.listeners) item.onData(value);
          },
          (error) => {
            for (const item of entry.listeners) item.onError(error);
          },
        ) || (() => {});
    } catch (error) {
      onError(error);
    }
  }
  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    entry.listeners.delete(listener);
    if (!entry.listeners.size) {
      entries.delete(key);
      entry.stop();
    }
  };
}
