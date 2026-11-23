import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { PlugZap, RefreshCw } from "lucide-react";
import { Button } from "#/components/ui/button";
import { WorkScopeProvider } from "#/components/widget-kit/work-scope-context";
import { WorkScopeToggle } from "#/components/widget-kit/work-scope-toggle";
import type { IntegrationManifest } from "#/core/integration";
import type { WorkScope } from "#/core/work-scope";
import { integrationQueryKey } from "#/lib/query-keys";

/** What the page needs to know about the connection. Supplied by the route. */
export interface OverviewConnection {
	configured: boolean;
	connected: boolean;
	accountLabel: string | null;
}

interface OverviewPageProps {
	integration: IntegrationManifest;
	connection: OverviewConnection | undefined;
	/** Controlled so the app can keep it in the URL. */
	scope: WorkScope;
	onScopeChange: (scope: WorkScope) => void;
}

/** Frame for one source's overview: header, filter, refresh, connect prompt. */
export function OverviewPage({
	integration,
	connection,
	scope,
	onScopeChange,
}: OverviewPageProps) {
	const queryClient = useQueryClient();
	const Icon = integration.icon;
	const overview = integration.overview;
	const connected = connection?.connected ?? false;

	return (
		<div className="space-y-6">
			<header className="flex flex-wrap items-center gap-3">
				<span className="grid size-10 shrink-0 place-items-center rounded-lg border bg-card">
					<Icon className="size-5" />
				</span>
				<div className="min-w-0 flex-1">
					<h1 className="truncate text-2xl font-semibold tracking-tight">
						{integration.name}
					</h1>
					<p className="truncate text-sm text-muted-foreground">
						{connected && connection?.accountLabel
							? `Signed in as ${connection.accountLabel}`
							: integration.description}
					</p>
				</div>
				{connected && (
					<div className="flex flex-wrap items-center gap-2">
						{overview?.scoped && (
							<WorkScopeToggle value={scope} onChange={onScopeChange} />
						)}
						<Button
							variant="ghost"
							size="sm"
							onClick={() =>
								queryClient.invalidateQueries({
									queryKey: integrationQueryKey(integration.id),
								})
							}
						>
							<RefreshCw /> Refresh
						</Button>
					</div>
				)}
			</header>

			{!connected ? (
				<ConnectPrompt
					name={integration.name}
					configured={connection?.configured ?? false}
				/>
			) : overview ? (
				<WorkScopeProvider scope={scope}>
					<overview.Component />
				</WorkScopeProvider>
			) : null}
		</div>
	);
}

function ConnectPrompt({
	name,
	configured,
}: {
	name: string;
	configured: boolean;
}) {
	return (
		<div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-12 text-center">
			<PlugZap className="size-6 text-muted-foreground" />
			<div>
				<p className="font-medium">Connect {name} to see your overview</p>
				<p className="mt-1 text-sm text-muted-foreground">
					{configured
						? "Sign in from the Integrations page."
						: "Add your OAuth app on the Integrations page, then sign in."}
				</p>
			</div>
			<Button asChild size="sm">
				<Link to="/settings/integrations">
					{configured ? "Connect" : "Set up"}
				</Link>
			</Button>
		</div>
	);
}
