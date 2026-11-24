import { Sparkles } from "lucide-react";
import type { MeetingWithRelated } from "#/components/meeting-extras/meeting-extras";
import {
	AiSummaryActions,
	AiSummaryBody,
} from "#/features/ai-summary/components/ai-summary-parts";
import { useAiSummary } from "#/features/ai-summary/use-ai-summary";
import { meetingPrepPrompt, PREP_SYSTEM_PROMPT } from "./prep-prompt";

/**
 * An AI briefing below a meeting's prep card. Stored per meeting; updated
 * only on request when the meeting or its related items changed.
 */
export function AiMeetingPrep(prep: MeetingWithRelated) {
	const state = useAiSummary({
		scope: `meeting|${prep.meeting.id}`,
		system: PREP_SYSTEM_PROMPT,
		prompt: meetingPrepPrompt(prep),
	});
	if (!state.chosen) return null;
	return (
		<div className="mt-3 border-t pt-3">
			<div className="mb-2 flex items-center gap-2">
				<Sparkles className="size-3.5 text-primary" />
				<span className="flex-1 text-xs font-semibold">AI briefing</span>
				<AiSummaryActions state={state} label="Prepare" />
			</div>
			<AiSummaryBody
				state={state}
				pitch=""
				intro="Purpose, what's open with these people and talking points. The meeting and the items above are sent to the provider."
				changed="Something changed since this briefing (new mail, issues or attendees). Update it to include it."
			/>
		</div>
	);
}
