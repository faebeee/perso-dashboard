import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "#/app/shell/app-shell";
import { InsightsPage } from "#/features/insights/components/insights-page";

export const Route = createFileRoute("/insights")({
	component: InsightsRoute,
});

function InsightsRoute() {
	return (
		<>
			<PageHeader
				title="Insights"
				description="What you got done, and how your weeks are trending."
			/>
			<InsightsPage />
		</>
	);
}
