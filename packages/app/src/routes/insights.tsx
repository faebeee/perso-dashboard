import { createRoute } from "@tanstack/react-router";
import { PageHeader } from "#/app/shell/app-shell";
import { WeeklyReportCard } from "#/app/weekly-report/weekly-report-card";
import { InsightsPage } from "#/features/insights/components/insights-page";
import { rootRoute } from "./__root";

export const insightsRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/insights",
	component: InsightsRoute,
});

function InsightsRoute() {
	return (
		<>
			<PageHeader
				title="Insights"
				description="What you got done, and how your weeks are trending."
			/>
			<div className="space-y-6">
				<WeeklyReportCard />
				<InsightsPage />
			</div>
		</>
	);
}
