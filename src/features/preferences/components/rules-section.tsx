import { useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import {
	type AttentionRules,
	attentionRulesSchema,
	DEFAULT_ATTENTION_RULES,
} from "#/core/attention";
import { stringListSetting } from "#/core/integration";
import {
	DEFAULT_WAITING_RULES,
	type WaitingRules,
	waitingRulesSchema,
} from "#/core/waiting";
import { integrationManifests } from "#/integrations/registry";
import { integrationBackends } from "#/integrations/runtime-registry";
import { queryKeys } from "#/lib/query-keys";
import {
	integrationSettingsFor,
	preferences,
	setIntegrationSetting,
} from "#/platform/preferences";
import { ChoiceListRule } from "./choice-list-rule";

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

/** Editable thresholds for Urgent and Waiting, plus integration settings. */
export function RulesSection() {
	const prefs = useSyncExternalStore(preferences.subscribe, preferences.get);
	const queryClient = useQueryClient();
	const [error, setError] = useState<{ group: string; message: string } | null>(
		null,
	);

	// Rules change what providers are asked: refetch what depends on them.
	const refresh = () =>
		Promise.all([
			queryClient.invalidateQueries({ queryKey: queryKeys.combined }),
			queryClient.invalidateQueries({ queryKey: queryKeys.integrations }),
		]);

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

	const withSettings = integrationBackends.filter((b) => b.settings?.length);
	const nameOf = (id: string) =>
		integrationManifests.find((m) => m.id === id)?.name ?? id;

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

			{withSettings.map((backend) => (
				<RuleGroup
					key={backend.id}
					id={`integration-${backend.id}`}
					title={nameOf(backend.id)}
					description={`Settings for ${nameOf(backend.id)}.`}
				>
					{(backend.settings ?? []).map((setting) => {
						const value = stringListSetting(
							integrationSettingsFor(backend, prefs),
							setting,
						);
						const save = (next: string[]) => {
							setIntegrationSetting(
								backend.id,
								setting.key,
								next.length > 0 ? next : setting.default,
							);
							void refresh();
						};
						return setting.type === "choice-list" ? (
							<ChoiceListRule
								key={setting.key}
								integrationId={backend.id}
								setting={setting}
								value={value}
								onChange={save}
							/>
						) : (
							<ListRule
								key={setting.key}
								label={setting.label}
								hint={setting.description}
								caseSensitive
								value={value}
								onCommit={(next) => {
									save(next);
									return true;
								}}
							/>
						);
					})}
				</RuleGroup>
			))}
		</div>
	);
}

function RuleGroup({
	id,
	title,
	description,
	onReset,
	error,
	children,
}: {
	id?: string;
	title: string;
	description: string;
	onReset?: () => void;
	error?: string;
	children: React.ReactNode;
}) {
	return (
		<section
			id={id}
			aria-label={`${title} rules`}
			className="max-w-2xl rounded-xl border bg-card shadow-xs"
		>
			<header className="flex items-start gap-3 border-b px-4 py-3">
				<div className="min-w-0 flex-1">
					<h3 className="text-sm font-semibold">{title}</h3>
					<p className="text-xs text-muted-foreground">{description}</p>
				</div>
				{onReset && (
					<Button variant="ghost" size="sm" className="h-7" onClick={onReset}>
						<RotateCcw /> Defaults
					</Button>
				)}
			</header>
			<div className="divide-y">{children}</div>
			{error && (
				<p role="alert" className="border-t px-4 py-2 text-xs text-destructive">
					{error}
				</p>
			)}
		</section>
	);
}

/** Commits on blur or Enter; reverts the field when the value is rejected. */
function NumberRule({
	label,
	unit,
	value,
	onCommit,
}: {
	label: string;
	unit: string;
	value: number;
	onCommit: (value: number) => boolean;
}) {
	const id = useId();
	const [draft, setDraft] = useState(String(value));
	useEffect(() => setDraft(String(value)), [value]);
	const commit = () => {
		const parsed = Number(draft);
		if (draft.trim() === String(value)) return;
		if (!Number.isInteger(parsed) || !onCommit(parsed)) setDraft(String(value));
	};
	return (
		<div className="flex items-center gap-3 px-4 py-2.5">
			<label htmlFor={id} className="min-w-0 flex-1 text-sm">
				{label}
			</label>
			<Input
				id={id}
				type="number"
				inputMode="numeric"
				className="h-8 w-20 text-right"
				value={draft}
				onChange={(e) => setDraft(e.target.value)}
				onBlur={commit}
				onKeyDown={(e) => e.key === "Enter" && commit()}
			/>
			<span className="w-12 text-xs text-muted-foreground">{unit}</span>
		</div>
	);
}

/** Comma-separated values; commits on blur or Enter. */
function ListRule({
	label,
	hint,
	value,
	caseSensitive = false,
	onCommit,
}: {
	label: string;
	hint?: string;
	value: string[];
	caseSensitive?: boolean;
	onCommit: (value: string[]) => boolean;
}) {
	const id = useId();
	const joined = value.join(", ");
	const [draft, setDraft] = useState(joined);
	useEffect(() => setDraft(joined), [joined]);
	const commit = () => {
		if (draft === joined) return;
		const next = draft
			.split(",")
			.map((v) => v.trim())
			.map((v) => (caseSensitive ? v : v.toLowerCase()))
			.filter(Boolean);
		if (!onCommit(next)) setDraft(joined);
	};
	return (
		<div className="px-4 py-2.5">
			<label htmlFor={id} className="text-sm">
				{label}
			</label>
			{hint && <p className="text-xs text-muted-foreground">{hint}</p>}
			<Input
				id={id}
				className="mt-1.5 h-8"
				value={draft}
				placeholder="Comma-separated"
				onChange={(e) => setDraft(e.target.value)}
				onBlur={commit}
				onKeyDown={(e) => e.key === "Enter" && commit()}
			/>
		</div>
	);
}
