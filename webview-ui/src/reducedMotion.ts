/** Media query for the OS-level "reduce motion" accessibility setting. */
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * True when the viewer asked the OS to reduce motion. Read live (not cached)
 * so toggling the setting applies without a reload; false wherever
 * `matchMedia` is missing (Node test runner).
 */
export function prefersReducedMotion(): boolean {
  // Structural type: this module is also compiled for the Node test runner (no DOM lib).
  const { matchMedia } = globalThis as { matchMedia?: (query: string) => { matches: boolean } };
  try {
    return matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false;
  } catch {
    return false;
  }
}
