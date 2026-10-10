import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * All routes depend on the client-side session state (sessionStorage), so
 * they are rendered in the browser only (spec-01 R4.5 / SSR guard).
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
