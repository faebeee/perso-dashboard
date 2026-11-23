import { createRoute } from "@tanstack/react-router";
import { DailyReviewPage } from "#/app/daily-review/daily-review-page";
import { PageHeader } from "#/app/shell/app-shell";
import { rootRoute } from "./__root";

export const reviewRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/review",
	component: ReviewRoute,
});

function ReviewRoute() {
	return (
		<>
			<PageHeader
				title="Daily review"
				description="What you did since your last workday, today's plan and blockers, ready for your standup."
			/>
			<DailyReviewPage />
		</>
	);
}
