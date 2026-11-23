import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PageHeader } from "#/app/shell/app-shell";
import { ConnectionsPage } from "#/features/connections/components/connections-page";
import { connectionQueries } from "#/features/connections/queries";
import { integrationManifests } from "#/integrations/registry";

const searchSchema = z.object({
	connected: z.string().optional(),
	error: z.string().optional(),
	integration: z.string().optional(),
});

export const Route = createFileRoute("/settings/integrations")({
	validateSearch: searchSchema,
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(connectionQueries.statuses()),
	component: IntegrationsRoute,
});

function IntegrationsRoute() {
	const flash = Route.useSearch();
	return (
		<>
			<PageHeader
				title="Integrations"
				description="Connect your accounts. Tokens are encrypted and stored locally."
			/>
			<ConnectionsPage integrations={integrationManifests} flash={flash} />
		</>
	);
}
