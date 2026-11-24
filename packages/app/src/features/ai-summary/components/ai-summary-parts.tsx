import { Button } from "@dashboard/ui/components/button";
import { cn } from "@dashboard/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import {
	Check,
	ClipboardCopy,
	Loader2,
	RefreshCw,
	Sparkles,
	X,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { getLlmProvider } from "#/llm/registry";
import type { AiSummaryState } from "../use-ai-summary";

const stamp = new Intl.DateTimeFormat(undefined, {
	weekday: "short",
	hour: "2-digit",
	minute: "2-digit",
});

/** Copy / Summarize / Update / Cancel, for a card header. */
export function AiSummaryActions({
	state,
	label = "Summarize",
}: {
	state: AiSummaryState;
	label?: string;
}) {
	if (!state.chosen) return null;
	return (
		<div className="flex items-center gap-2">
			{state.shown && !state.pending && <CopyButton text={state.shown.text} />}
			{state.pending ? (
				<Button
					size="sm"
					variant="outline"
					className="h-7"
					onClick={state.cancel}
				>
					<X />
					Cancel
				</Button>
			) : (
				!state.current && (
					<Button
						size="sm"
						className="h-7"
						disabled={!state.canSummarize}
						onClick={state.summarize}
					>
						{state.shown ? <RefreshCw /> : <Sparkles />}
						{state.shown ? "Update" : label}
					</Button>
				)
			)}
		</div>
	);
}

/** The stored text, its status, or what the button would do. */
export function AiSummaryBody({
	state,
	pitch,
	intro,
	changed = "The input changed since this was written. Update it to include the changes.",
}: {
	state: AiSummaryState;
	/** Shown when no provider is chosen: what the feature would do. */
	pitch: string;
	/** Shown before the first run: what is sent. */
	intro: ReactNode;
	/** Banner over an outdated text. */
	changed?: string;
}) {
	const { chosen, shown } = state;
	if (!chosen)
		return (
			<p className="text-sm text-muted-foreground">
				{pitch}{" "}
				<Link to="/settings/preferences" className="underline">
					Choose a provider in Preferences
				</Link>
				.
			</p>
		);
	if (state.pending)
		return (
			<p className="flex items-center gap-2 text-sm text-muted-foreground">
				<Loader2 className="size-4 animate-spin" />
				Writing with {chosen.provider.label} ({chosen.model})…
			</p>
		);
	return (
		<div className="space-y-2">
			{state.error && (
				<p className="text-sm text-destructive">{state.error.message}</p>
			)}
			{shown ? (
				<div className="space-y-1">
					{state.outdated && (
						<p className="text-xs font-medium text-amber-700 dark:text-amber-400">
							{changed}
						</p>
					)}
					<div
						className={cn(
							"max-h-96 overflow-auto rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap select-text",
							state.outdated && "opacity-60",
						)}
					>
						{shown.text}
					</div>
					<p className="text-xs text-muted-foreground">
						{getLlmProvider(shown.providerId)?.label ?? shown.providerId} ·{" "}
						{shown.model} · {stamp.format(shown.createdAt)}
						{state.outdated ? "" : ". Up to date, no new request needed"}. Check
						it before you share it.
					</p>
				</div>
			) : (
				!state.error && (
					<p className="text-sm text-muted-foreground">
						{intro} Uses {chosen.provider.label} ({chosen.model}); the result is
						kept until the input changes.
					</p>
				)
			)}
		</div>
	);
}

export function CopyButton({ text }: { text: string }) {
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
