import { createRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader } from "#/app/shell/app-shell";
import { attentionToTriage, TriageBar } from "#/app/triage/triage-bar";
import { AttentionView } from "#/features/attention/components/attention-view";
import { useAttention } from "#/features/attention/queries";
import { rootRoute } from "./__root";

export const urgentRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/urgent",
	component: UrgentRoute,
});

function UrgentRoute() {
	return (
		<div className="mx-auto max-w-3xl">
			<PageHeader
				title="Urgent"
				description="Only what needs you soon: meetings about to start, people waiting on you, overdue or high-priority issues and important mail."
			/>
			<UrgentTriage>
				<AttentionView />
			</UrgentTriage>
		</div>
	);
}

function UrgentTriage({ children }: { children: React.ReactNode }) {
	const { data } = useAttention();
	const items = useMemo(
		() => data?.items.flatMap((item) => attentionToTriage(item) ?? []),
		[data],
	);
	return <TriageBar items={items}>{children}</TriageBar>;
}
