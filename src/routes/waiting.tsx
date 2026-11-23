import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "#/app/shell/app-shell";
import { WaitingPage } from "#/features/waiting/components/waiting-page";

export const Route = createFileRoute("/waiting")({
	component: WaitingRoute,
});

function WaitingRoute() {
	return (
		<>
			<PageHeader
				title="Waiting"
				description="What you're waiting on others for: reviews, answers, replies, and prep for your next meetings."
			/>
			<WaitingPage />
		</>
	);
}
