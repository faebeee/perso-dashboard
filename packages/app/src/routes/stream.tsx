import { createRoute } from "@tanstack/react-router";
import { PageHeader } from "#/app/shell/app-shell";
import { StreamPage } from "#/app/stream/stream-page";
import { rootRoute } from "./__root";

export const streamRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/live",
	component: StreamRoute,
});

function StreamRoute() {
	return (
		<div className="mx-auto max-w-3xl">
			<PageHeader
				title="Live"
				description="What is happening across your tools as it happens: mail, ticket and pull request updates, commits. Newest on top."
			/>
			<StreamPage />
		</div>
	);
}
