import { getHost } from "@dashboard/platform/host";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { CommandPaletteProvider } from "#/app/command-palette";
import { DesktopSync } from "#/app/desktop/desktop-sync";
import { GlobalShortcuts } from "#/app/desktop/global-shortcuts";
import { AppShell } from "#/app/shell/app-shell";
import { sourceRegistry } from "#/app/sources";
import {
	type ActionableItem,
	ItemActionsProvider,
} from "#/components/item-actions/item-actions";
import { ItemDetailProvider } from "#/components/item-detail/item-detail-provider";
import { SourceProvider } from "#/components/source-kit/source-context";
import { PinToTodayButton } from "#/features/today/components/pin-to-today";
import { QuickCaptureProvider } from "#/features/today/components/quick-capture";

export interface RouterContext {
	queryClient: QueryClient;
}

/** The root of the shared route tree. */
export const rootRoute = createRootRouteWithContext<RouterContext>()({
	component: RootLayout,
});

const openExternal = (url: string) => {
	getHost()
		.openExternal(url)
		.catch((cause) => console.error("Could not open link", cause));
};

/** Actions on every item row, contributed by features. */
const renderItemActions = (item: ActionableItem) => (
	<PinToTodayButton item={item} />
);

function RootLayout() {
	return (
		<>
			<SourceProvider sources={sourceRegistry}>
				<ItemDetailProvider openExternal={openExternal}>
					<ItemActionsProvider render={renderItemActions}>
						<QuickCaptureProvider>
							<CommandPaletteProvider>
								<AppShell>
									<Outlet />
								</AppShell>
							</CommandPaletteProvider>
							<GlobalShortcuts />
						</QuickCaptureProvider>
					</ItemActionsProvider>
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
