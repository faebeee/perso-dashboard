import { workScopeSchema } from "@dashboard/core/work-scope";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createRoute, notFound } from "@tanstack/react-router";
import { z } from "zod";
import { connectionQueries } from "#/features/connections/queries";
import { OverviewPage } from "#/features/integration-overview/components/overview-page";
import { getIntegrationManifest } from "#/integrations/registry";
import { rootRoute } from "./__root";

const searchSchema = z.object({
	scope: workScopeSchema.optional().catch(undefined),
});

/** One page per source that declares an `overview` in its manifest. */
export const appRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/apps/$integrationId",
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
	const { integrationId } = appRoute.useParams();
	const { scope = "all" } = appRoute.useSearch();
	const navigate = appRoute.useNavigate();
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
