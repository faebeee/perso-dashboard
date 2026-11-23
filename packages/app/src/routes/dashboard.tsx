import { workScopeSchema } from "@dashboard/core/work-scope";
import { createRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
	defaultDashboard,
	widgetCatalog,
	widgetGroupLabel,
} from "#/app/catalog";
import { PageHeader } from "#/app/shell/app-shell";
import { DashboardPage } from "#/features/dashboard/components/dashboard-page";
import { layoutQueries } from "#/features/dashboard/queries";
import { rootRoute } from "./__root";

const searchSchema = z.object({
	// Optional so the default ("all") keeps a clean URL; invalid values are dropped.
	scope: workScopeSchema.optional().catch(undefined),
});

export const dashboardRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	validateSearch: searchSchema,
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(layoutQueries.current()),
	component: DashboardRoute,
});

function DashboardRoute() {
	const { scope = "all" } = dashboardRoute.useSearch();
	const navigate = dashboardRoute.useNavigate();
	return (
		<>
			<PageHeader title="Dashboard" />
			<DashboardPage
				catalog={widgetCatalog}
				defaultPlacements={defaultDashboard}
				groupLabel={widgetGroupLabel}
				scope={scope}
				onScopeChange={(next) =>
					navigate({
						search: { scope: next === "all" ? undefined : next },
						replace: true,
						resetScroll: false,
					})
				}
			/>
		</>
	);
}
