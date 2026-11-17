/** Tells open screens that the asset register changed, so they can reload it. */
const EVENT = "rca-assets-changed";

export function notifyAssetsChanged(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

export function onAssetsChanged(fn: () => void): () => void {
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}
