import { Sparkles } from "lucide-react";
import {
	AiSummaryActions,
	AiSummaryBody,
} from "#/features/ai-summary/components/ai-summary-parts";
import { useAiSummary } from "#/features/ai-summary/use-ai-summary";
import { Card } from "./review-card";

/**
 * The Daily Review summarized by the LLM chosen in Preferences. Summaries
 * are stored: an unchanged review shows its summary without asking the
 * model again. When the review changed, the last summary of this period and
 * filter (`scope`) is shown as outdated until you update it.
 */
export function AiSummaryCard({
	system,
	prompt,
	scope,
	disabled,
}: {
	system: string;
	prompt: string;
	scope: string;
	/** While the review is still loading: its content isn't final yet. */
	disabled: boolean;
}) {
	const state = useAiSummary({
		scope: `review|${scope}`,
		system,
		prompt,
		enabled: !disabled,
	});
	return (
		<Card
			title="AI summary"
			icon={Sparkles}
			action={<AiSummaryActions state={state} />}
		>
			<AiSummaryBody
				state={state}
				pitch="Let a language model turn this review into a short standup update."
				intro="Summarize what's on this page: the filtered review and your notes are sent to the provider."
				changed="The review changed since this summary. Update it to include the changes."
			/>
		</Card>
	);
}
