import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "#/app/shell/app-shell";
import { AttentionView } from "#/features/attention/components/attention-view";

export const Route = createFileRoute("/urgent")({
	component: UrgentRoute,
});

function UrgentRoute() {
	return (
		<div className="mx-auto max-w-3xl">
			<PageHeader
				title="Urgent"
				description="Only what needs you soon: meetings about to start, people waiting on you, overdue or high-priority issues and important mail."
			/>
			<AttentionView />
		</div>
	);
}
