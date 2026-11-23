import { createRootRoute } from "@tanstack/react-router";

/**
 * Placeholder for TanStack Start's build, which derives its asset manifest
 * from a file-based route tree. The app itself runs on the shared,
 * code-based route tree from `@dashboard/app` (see `../router.tsx`); the
 * generated `routeTree.gen.ts` is not imported anywhere.
 */
export const Route = createRootRoute();
