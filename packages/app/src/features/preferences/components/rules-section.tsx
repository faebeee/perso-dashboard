import {
	type AttentionRules,
	attentionRulesSchema,
	DEFAULT_ATTENTION_RULES,
} from "@dashboard/core/attention";
import {
	DEFAULT_WAITING_RULES,
	type WaitingRules,
	waitingRulesSchema,
} from "@dashboard/core/waiting";
import { preferences } from "@dashboard/platform/preferences";
import { useState, useSyncExternalStore } from "react";
import {
	ListRule,
	NumberRule,
	RuleGroup,
	useRefreshAfterRuleChange,
} from "./rule-kit";

type NumberKey<T> = {
	[K in keyof T]: T[K] extends number ? K : never;
}[keyof T];

const ATTENTION_FIELDS: {
	key: NumberKey<AttentionRules>;
	label: string;
	unit: string;
}[] = [
	{
		key: "meetingNowMinutes",
		label: "A meeting is “right now” within",
		unit: "min",
	},
	{ key: "meetingSoonMinutes", label: "Meetings show up within", unit: "min" },
	{
		key: "invitationWindowHours",
		label: "Unanswered invitations for the next",
		unit: "hours",
	},
	{
		key: "reviewStaleHours",
		label: "Review requests escalate after",
		unit: "hours",
	},
	{
		key: "emailWindowDays",
		label: "Important unread mail from the last",
		unit: "days",
	},
];

const WAITING_FIELDS: {
	key: NumberKey<WaitingRules>;
	label: string;
	unit: string;
}[] = [
	{
		key: "noReplyAfterDays",
		label: "An email counts as unanswered after",
		unit: "days",
	},
	{
		key: "noReplyWindowDays",
		label: "Check sent mail from the last",
		unit: "days",
	},
	{
		key: "invitationWindowDays",
		label: "Check your meetings for the next",
		unit: "days",
	},
	{ key: "relatedWindowDays", label: "Meeting prep looks back", unit: "days" },
];

/** Cross-field checks the schemas can't express per field. */
function attentionProblem(rules: AttentionRules): string | null {
	return rules.meetingNowMinutes > rules.meetingSoonMinutes
		? "“Right now” can't be longer than “show up within”."
		: null;
}

function waitingProblem(rules: WaitingRules): string | null {
	return rules.noReplyAfterDays >= rules.noReplyWindowDays
		? "The sent-mail window must be longer than “unanswered after”."
		: null;
}

/** Editable thresholds for Urgent and Waiting. */
export function RulesSection() {
	const prefs = useSyncExternalStore(preferences.subscribe, preferences.get);
	const [error, setError] = useState<{ group: string; message: string } | null>(
		null,
	);

	const refresh = useRefreshAfterRuleChange();

	const saveAttention = (patch: Partial<AttentionRules>) => {
		const next = attentionRulesSchema.safeParse({
			...prefs.attentionRules,
			...patch,
		});
		const problem = next.success
			? attentionProblem(next.data)
			: "That value is out of range.";
		if (!next.success || problem) {
			setError({ group: "attention", message: problem ?? "Invalid value." });
			return false;
		}
		setError(null);
		preferences.set("attentionRules", next.data);
		void refresh();
		return true;
	};

	const saveWaiting = (patch: Partial<WaitingRules>) => {
		const next = waitingRulesSchema.safeParse({
			...prefs.waitingRules,
			...patch,
		});
		const problem = next.success
			? waitingProblem(next.data)
			: "That value is out of range.";
		if (!next.success || problem) {
			setError({ group: "waiting", message: problem ?? "Invalid value." });
			return false;
		}
		setError(null);
		preferences.set("waitingRules", next.data);
		void refresh();
		return true;
	};

	return (
		<div className="space-y-6">
			<RuleGroup
				title="Urgent"
				description="When something shows up on Urgent, in the menu bar and in notifications."
				onReset={() => {
					preferences.set("attentionRules", DEFAULT_ATTENTION_RULES);
					setError(null);
					void refresh();
				}}
				error={error?.group === "attention" ? error.message : undefined}
			>
				{ATTENTION_FIELDS.map((field) => (
					<NumberRule
						key={field.key}
						label={field.label}
						unit={field.unit}
						value={prefs.attentionRules[field.key]}
						onCommit={(value) => saveAttention({ [field.key]: value })}
					/>
				))}
				<ListRule
					label="Critical priorities (→ Today)"
					value={prefs.attentionRules.criticalPriorities}
					onCommit={(value) => saveAttention({ criticalPriorities: value })}
				/>
				<ListRule
					label="High priorities (→ When you can)"
					value={prefs.attentionRules.highPriorities}
					onCommit={(value) => saveAttention({ highPriorities: value })}
				/>
			</RuleGroup>

			<RuleGroup
				title="Waiting"
				description="When something counts as waiting on other people."
				onReset={() => {
					preferences.set("waitingRules", DEFAULT_WAITING_RULES);
					setError(null);
					void refresh();
				}}
				error={error?.group === "waiting" ? error.message : undefined}
			>
				{WAITING_FIELDS.map((field) => (
					<NumberRule
						key={field.key}
						label={field.label}
						unit={field.unit}
						value={prefs.waitingRules[field.key]}
						onCommit={(value) => saveWaiting({ [field.key]: value })}
					/>
				))}
			</RuleGroup>
		</div>
	);
}
