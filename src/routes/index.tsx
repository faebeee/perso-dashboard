import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { widgetCatalog, widgetGroupLabel } from "#/app/catalog";
import { PageHeader } from "#/app/shell/app-shell";
import { workScopeSchema } from "#/core/work-scope";
import { DashboardPage } from "#/features/dashboard/components/dashboard-page";
import { layoutQueries } from "#/features/dashboard/queries";

const searchSchema = z.object({
	// Optional so the default ("all") keeps a clean URL; invalid values are dropped.
	scope: workScopeSchema.optional().catch(undefined),
});

export const Route = createFileRoute("/")({
	validateSearch: searchSchema,
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(layoutQueries.current()),
	component: DashboardRoute,
});

function DashboardRoute() {
	const { scope = "all" } = Route.useSearch();
	const navigate = Route.useNavigate();
	return (
		<>
			<PageHeader title="Dashboard" />
			<DashboardPage
				catalog={widgetCatalog}
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
