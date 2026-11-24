import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { createQueryClient } from "./app/query-client";
import { MAIN_SCROLL_ID } from "./app/shell/app-shell";
import { routeTree } from "./routes/route-tree";

/** The app's router, mounted by the shell (apps/desktop). */
export function createAppRouter() {
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
