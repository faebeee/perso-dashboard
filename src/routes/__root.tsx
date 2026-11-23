import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { AppShell } from "#/app/shell/app-shell";
import { sourceRegistry } from "#/app/sources";
import { SourceProvider } from "#/components/source-kit/source-context";

interface RouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
	component: RootLayout,
});

function RootLayout() {
	return (
		<>
			<SourceProvider sources={sourceRegistry}>
				<AppShell>
					<Outlet />
				</AppShell>
			</SourceProvider>
			{import.meta.env.DEV && (
				<TanStackDevtools
					config={{ position: "bottom-right" }}
					plugins={[
						{
							name: "TanStack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
						{ name: "TanStack Query", render: <ReactQueryDevtoolsPanel /> },
					]}
				/>
			)}
		</>
	);
}
