import { Button } from "@dashboard/ui/components/button";
import { Input } from "@dashboard/ui/components/input";
import { useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { type ReactNode, useEffect, useId, useState } from "react";
import { queryKeys } from "#/lib/query-keys";

/** Rules and settings change what providers are asked: refetch what depends on them. */
export function useRefreshAfterRuleChange() {
	const queryClient = useQueryClient();
	return () =>
		Promise.all([
			queryClient.invalidateQueries({ queryKey: queryKeys.combined }),
			queryClient.invalidateQueries({ queryKey: queryKeys.integrations }),
		]);
}

export function RuleGroup({
	title,
	description,
	onReset,
	error,
	children,
}: {
	title: string;
	description: string;
	onReset?: () => void;
	error?: string;
	children: ReactNode;
}) {
	return (
		<section
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
export function NumberRule({
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
export function ListRule({
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
