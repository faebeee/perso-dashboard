import { createRoute } from "@tanstack/react-router";
import { AiMeetingPrep } from "#/app/meeting-prep/ai-meeting-prep";
import { PageHeader } from "#/app/shell/app-shell";
import { MeetingExtrasProvider } from "#/components/meeting-extras/meeting-extras";
import { WaitingPage } from "#/features/waiting/components/waiting-page";
import { rootRoute } from "./__root";

export const waitingRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/waiting",
	component: WaitingRoute,
});

function WaitingRoute() {
	return (
		<>
			<PageHeader
				title="Waiting"
				description="What you're waiting on others for: reviews, answers, replies, and prep for your next meetings."
			/>
			<MeetingExtrasProvider render={(prep) => <AiMeetingPrep {...prep} />}>
				<WaitingPage />
			</MeetingExtrasProvider>
		</>
	);
}
