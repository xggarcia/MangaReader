import type { createHashRouter } from 'react-router';

type AppRouter = ReturnType<typeof createHashRouter>;

/** How a navigation animates: iOS push/pop, tab cross-fade or the cover-to-reader morph. */
export type NavigationKind = 'forward' | 'back' | 'tab' | 'open';

let router: AppRouter | null = null;
let clearTimer: ReturnType<typeof setTimeout> | null = null;

/** Registered once at startup (avoids an import cycle between the router and its screens). */
export function registerRouter(appRouter: AppRouter): void {
  router = appRouter;
}

/** Tells the view-transition CSS which animation to play for the next navigation. */
function markNavigation(kind: NavigationKind): void {
  document.documentElement.dataset.nav = kind;
  if (clearTimer) clearTimeout(clearTimer);
  clearTimer = setTimeout(() => delete document.documentElement.dataset.nav, 1000);
}

export function goTo(
  path: string,
  kind: NavigationKind = 'forward',
  options: { replace?: boolean } = {},
): void {
  if (!router) return;
  markNavigation(kind);
  void router.navigate(path, { viewTransition: true, replace: options.replace });
}

/** Back in history; React Router replays the view transition of the matching forward push. */
export function goBack(): void {
  if (!router) return;
  markNavigation('back');
  void router.navigate(-1);
}
