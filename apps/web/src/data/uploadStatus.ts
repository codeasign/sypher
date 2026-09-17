// Tiny external store (useSyncExternalStore-compatible) tracking how many
// Bunny uploads are in flight at once, so a single global overlay
// (components/UploadOverlay) can show/hide itself without every upload call
// site wiring its own loading state.

let count = 0;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function beginUpload(): void {
  count += 1;
  emit();
}

export function endUpload(): void {
  count = Math.max(0, count - 1);
  emit();
}

export function subscribeUploadStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getUploadCountSnapshot(): number {
  return count;
}
