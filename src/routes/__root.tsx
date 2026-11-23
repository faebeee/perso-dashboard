import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { CommandPaletteProvider } from "#/app/command-palette";
import { DesktopSync } from "#/app/desktop/desktop-sync";
import { AppShell } from "#/app/shell/app-shell";
import { sourceRegistry } from "#/app/sources";
import { ItemDetailProvider } from "#/components/item-detail/item-detail-provider";
import { SourceProvider } from "#/components/source-kit/source-context";
import { getHost } from "#/platform/host";

interface RouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
	component: RootLayout,
});

const openExternal = (url: string) => {
	getHost()
		.openExternal(url)
		.catch((cause) => console.error("Could not open link", cause));
};

function RootLayout() {
	return (
		<>
			<SourceProvider sources={sourceRegistry}>
				<ItemDetailProvider openExternal={openExternal}>
					<CommandPaletteProvider>
						<AppShell>
							<Outlet />
						</AppShell>
					</CommandPaletteProvider>
				</ItemDetailProvider>
				<DesktopSync />
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
