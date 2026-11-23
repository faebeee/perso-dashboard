import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { z } from "zod";
import { workScopeSchema } from "#/core/work-scope";
import { connectionQueries } from "#/features/connections/queries";
import { OverviewPage } from "#/features/integration-overview/components/overview-page";
import { getIntegrationManifest } from "#/integrations/registry";

const searchSchema = z.object({
	scope: workScopeSchema.optional().catch(undefined),
});

/** One page per source that declares an `overview` in its manifest. */
export const Route = createFileRoute("/apps/$integrationId")({
	validateSearch: searchSchema,
	loader: ({ context, params }) => {
		if (!getIntegrationManifest(params.integrationId)?.overview) {
			throw notFound();
		}
		return context.queryClient.ensureQueryData(connectionQueries.statuses());
	},
	component: AppRoute,
});

function AppRoute() {
	const { integrationId } = Route.useParams();
	const { scope = "all" } = Route.useSearch();
	const navigate = Route.useNavigate();
	const { data: statuses } = useSuspenseQuery(connectionQueries.statuses());
	const integration = getIntegrationManifest(integrationId);
	if (!integration) return null;

	return (
		<OverviewPage
			key={integration.id}
			integration={integration}
			connection={statuses.find((s) => s.integrationId === integrationId)}
			scope={scope}
			onScopeChange={(next) =>
				navigate({
					search: { scope: next === "all" ? undefined : next },
					replace: true,
					resetScroll: false,
				})
			}
		/>
	);
}
