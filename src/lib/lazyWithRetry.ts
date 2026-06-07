import { lazy, type ComponentType } from "react";

/**
 * Wraps React.lazy with automatic recovery from stale chunk errors.
 *
 * When the app is redeployed, browsers may still hold references to old
 * chunk filenames. The dynamic import then fails with "Failed to fetch
 * dynamically imported module" / ChunkLoadError, and the Suspense fallback
 * spins forever. We detect that error, hard-reload once, and avoid an
 * infinite reload loop with a sessionStorage flag.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    const reloadKey = "lovable:chunk-reloaded";
    try {
      return await factory();
    } catch (err: any) {
      const msg = String(err?.message ?? err);
      const isChunkErr =
        err?.name === "ChunkLoadError" ||
        /Failed to fetch dynamically imported module/i.test(msg) ||
        /Importing a module script failed/i.test(msg) ||
        /Loading chunk [\d]+ failed/i.test(msg);

      if (isChunkErr && typeof window !== "undefined") {
        const already = sessionStorage.getItem(reloadKey);
        if (!already) {
          sessionStorage.setItem(reloadKey, String(Date.now()));
          window.location.reload();
          // Return a never-resolving promise so Suspense keeps the fallback
          // visible until the reload happens.
          return new Promise(() => {}) as never;
        }
      }
      throw err;
    } finally {
      // Clear the flag on successful load so a future stale chunk can recover.
      if (typeof window !== "undefined") {
        // Defer so the success path completes first.
        setTimeout(() => sessionStorage.removeItem(reloadKey), 0);
      }
    }
  });
}
