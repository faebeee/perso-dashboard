import { useSuspenseQuery } from "@tanstack/react-query";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import type { IntegrationManifest } from "#/core/integration";
import { connectionQueries } from "../queries";
import { ConnectionCard } from "./connection-card";

interface ConnectionsPageProps {
	integrations: readonly IntegrationManifest[];
	/** Outcome of an OAuth round-trip, taken from the URL. */
	flash?: { connected?: string; error?: string; integration?: string };
}

export function ConnectionsPage({ integrations, flash }: ConnectionsPageProps) {
	const { data: statuses } = useSuspenseQuery(connectionQueries.statuses());
	const nameOf = (id?: string) =>
		integrations.find((i) => i.id === id)?.name ?? id;

	return (
		<div className="space-y-6">
			{flash?.connected && (
				<Alert>
					<CheckCircle2 />
					<AlertTitle>{nameOf(flash.connected)} connected</AlertTitle>
					<AlertDescription>Its widgets will now load data.</AlertDescription>
				</Alert>
			)}
			{flash?.error && (
				<Alert variant="destructive">
					<CircleAlert />
					<AlertTitle>Could not connect {nameOf(flash.integration)}</AlertTitle>
					<AlertDescription>
						{ERROR_MESSAGES[flash.error] ??
							`Provider returned "${flash.error}".`}
					</AlertDescription>
				</Alert>
			)}

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				{integrations.map((integration) => (
					<ConnectionCard
						key={integration.id}
						integration={integration}
						status={statuses.find((s) => s.integrationId === integration.id)}
					/>
				))}
			</div>
		</div>
	);
}

const ERROR_MESSAGES: Record<string, string> = {
	access_denied: "Access was denied on the provider's consent screen.",
	invalid_state: "The login session expired or was tampered with. Try again.",
	exchange_failed:
		"Exchanging the authorization code failed. Check the server logs.",
};
