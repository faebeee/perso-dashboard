import { createRoute } from "@tanstack/react-router";
import { PageHeader } from "#/app/shell/app-shell";
import { FeedView } from "#/features/feed/components/feed-view";
import { rootRoute } from "./__root";

export const feedRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/feed",
	component: FeedRoute,
});

function FeedRoute() {
	return (
		<div className="mx-auto max-w-3xl">
			<PageHeader
				title="My Work"
				description="Everything that needs your attention across connected tools, newest first."
			/>
			<FeedView />
		</div>
	);
}
