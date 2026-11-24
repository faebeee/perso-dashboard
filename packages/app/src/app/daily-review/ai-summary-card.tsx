import { preferences } from "@dashboard/platform/preferences";
import type { StoredAiSummary } from "@dashboard/platform/repositories/ai-summary-repository";
import { Button } from "@dashboard/ui/components/button";
import { cn } from "@dashboard/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
	Check,
	ClipboardCopy,
	Loader2,
	RefreshCw,
	Sparkles,
	X,
} from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { chosenLlm } from "#/features/ai-summary/fetchers";
import { llmQueries, useSummarize } from "#/features/ai-summary/queries";
import { getLlmProvider } from "#/llm/registry";
import { Card } from "./review-card";

const stamp = new Intl.DateTimeFormat(undefined, {
	weekday: "short",
	hour: "2-digit",
	minute: "2-digit",
});

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
	useSyncExternalStore(preferences.subscribe, preferences.get);
	const chosen = chosenLlm();
	const input = { scope, system, prompt };
	const stored = useQuery({
		...llmQueries.summary(input),
		enabled: Boolean(chosen) && !disabled,
	});
	const summarize = useSummarize();

	const { cancel } = summarize;
	// biome-ignore lint/correctness/useExhaustiveDependencies: abort when the scope changes
	useEffect(() => cancel(), [scope]);

	const current = stored.data?.current ?? null;
	const shown = current ?? stored.data?.latest ?? null;
	const outdated = Boolean(shown && !current);

	const action = chosen && (
		<div className="flex items-center gap-2">
			{shown && !summarize.isPending && <CopyButton text={shown.text} />}
			{summarize.isPending ? (
				<Button size="sm" variant="outline" className="h-7" onClick={cancel}>
					<X />
					Cancel
				</Button>
			) : (
				!current && (
					<Button
						size="sm"
						className="h-7"
						disabled={disabled || stored.isPending}
						onClick={() => summarize.mutate(input)}
					>
						{shown ? <RefreshCw /> : <Sparkles />}
						{shown ? "Update" : "Summarize"}
					</Button>
				)
			)}
		</div>
	);

	return (
		<Card title="AI summary" icon={Sparkles} action={action}>
			{!chosen ? (
				<p className="text-sm text-muted-foreground">
					Let a language model turn this review into a short standup update.{" "}
					<Link to="/settings/preferences" className="underline">
						Choose a provider in Preferences
					</Link>
					.
				</p>
			) : summarize.isPending ? (
				<p className="flex items-center gap-2 text-sm text-muted-foreground">
					<Loader2 className="size-4 animate-spin" />
					Writing with {chosen.provider.label} ({chosen.model})…
				</p>
			) : (
				<div className="space-y-2">
					{summarize.error && (
						<p className="text-sm text-destructive">
							{summarize.error.message}
						</p>
					)}
					{shown ? (
						<SummaryText summary={shown} outdated={outdated} />
					) : (
						!summarize.error && (
							<p className="text-sm text-muted-foreground">
								Summarize what's on this page with {chosen.provider.label} (
								{chosen.model}). The filtered review and your notes are sent to
								the provider. The summary is kept until the review changes.
							</p>
						)
					)}
				</div>
			)}
		</Card>
	);
}

function SummaryText({
	summary,
	outdated,
}: {
	summary: StoredAiSummary;
	outdated: boolean;
}) {
	const provider =
		getLlmProvider(summary.providerId)?.label ?? summary.providerId;
	return (
		<div className="space-y-1">
			{outdated && (
				<p className="text-xs font-medium text-amber-700 dark:text-amber-400">
					The review changed since this summary. Update it to include the
					changes.
				</p>
			)}
			<div
				className={cn(
					"max-h-80 overflow-auto rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap select-text",
					outdated && "opacity-60",
				)}
			>
				{summary.text}
			</div>
			<p className="text-xs text-muted-foreground">
				{provider} · {summary.model} · {stamp.format(summary.createdAt)}
				{outdated ? "" : ". Up to date, no new request needed"}. Check it before
				you share it.
			</p>
		</div>
	);
}

function CopyButton({ text }: { text: string }) {
	const [copied, setCopied] = useState(false);
	const copy = async () => {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			// clipboard unavailable: the text is selectable
		}
	};
	return (
		<Button size="sm" variant="outline" className="h-7" onClick={copy}>
			{copied ? <Check /> : <ClipboardCopy />}
			{copied ? "Copied" : "Copy"}
		</Button>
	);
}
