import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import type { ComponentType, ReactNode } from "react";
import { createQueryClient } from "./app/query-client";
import { MAIN_SCROLL_ID } from "./app/shell/app-shell";
import { rootRoute } from "./routes/__root";
import { routeTree } from "./routes/route-tree";

/** What a shell may add to the shared root route. */
export type RootRouteExtras = Parameters<typeof rootRoute.update>[0] & {
	/** The HTML document around the app, for shells that render one. */
	shellComponent?: ComponentType<{ children: ReactNode }>;
};

export interface AppRouterOptions {
	/**
	 * Shell-specific root options, e.g. the web app's HTML document
	 * (`shellComponent`) and `<head>`. The desktop shell needs none.
	 */
	root?: RootRouteExtras;
}

/** The app's router. Every shell (desktop, web) mounts the same route tree. */
export function createAppRouter({ root }: AppRouterOptions = {}) {
	// `update` only types the options every route has; `shellComponent` is
	// root-only but is applied the same way.
	if (root) rootRoute.update(root as Parameters<typeof rootRoute.update>[0]);
	const queryClient = createQueryClient();

	return createTanStackRouter({
		routeTree,
		context: { queryClient },
		scrollRestoration: true,
		// <main> scrolls, not the window: reset it on navigation too.
		scrollToTopSelectors: [`#${MAIN_SCROLL_ID}`],
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
		Wrap: ({ children }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		),
	});
}

export type AppRouter = ReturnType<typeof createAppRouter>;

declare module "@tanstack/react-router" {
	interface Register {
		router: AppRouter;
	}
}
