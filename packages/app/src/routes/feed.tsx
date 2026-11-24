import { useQuery } from "@tanstack/react-query";
import { createRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader } from "#/app/shell/app-shell";
import { TriageBar, workItemToTriage } from "#/app/triage/triage-bar";
import { FeedView } from "#/features/feed/components/feed-view";
import { feedQueries } from "#/features/feed/queries";
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
			<FeedTriage>
				<FeedView />
			</FeedTriage>
		</div>
	);
}

function FeedTriage({ children }: { children: React.ReactNode }) {
	const { data } = useQuery(feedQueries.all());
	const items = useMemo(() => data?.items.map(workItemToTriage), [data]);
	return <TriageBar items={items}>{children}</TriageBar>;
}
