/**
 * Bundled skyline backdrops, keyed by `OfficeLayout.backdrop.id`. Vite turns
 * `new URL(..., import.meta.url)` into an emitted asset URL relative to the
 * bundle, which resolves under the webview resource root in VS Code (allowed
 * by `img-src ${cspSource}`) and under 'self' in standalone. The image is only
 * ever drawn, never read back, so a cross-origin resource URL is fine.
 */
const BACKDROP_URLS: Record<string, string> = {
  hudson: new URL('../assets/backdrops/hudson.png', import.meta.url).href,
};

const cache = new Map<string, HTMLImageElement>();

/** Loaded image for a backdrop id, or null while loading / unknown id / no DOM. */
export function getBackdropImage(id: string | undefined): HTMLImageElement | null {
  if (!id || typeof Image === 'undefined') return null;
  const url = BACKDROP_URLS[id];
  if (!url) return null;
  let img = cache.get(id);
  if (!img) {
    img = new Image();
    img.src = url;
    cache.set(id, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}
