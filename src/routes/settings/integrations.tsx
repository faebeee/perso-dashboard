import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "#/app/shell/app-shell";
import { ConnectionsPage } from "#/features/connections/components/connections-page";
import { connectionQueries } from "#/features/connections/queries";
import { integrationManifests } from "#/integrations/registry";

export const Route = createFileRoute("/settings/integrations")({
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(connectionQueries.statuses()),
	component: IntegrationsRoute,
});

function IntegrationsRoute() {
	return (
		<>
			<PageHeader
				title="Integrations"
				description="Bring your own OAuth apps and connect your accounts. Credentials and tokens are encrypted on this device."
			/>
			<ConnectionsPage integrations={integrationManifests} />
		</>
	);
}
