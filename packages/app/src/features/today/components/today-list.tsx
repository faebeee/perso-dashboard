import type { TodayItem } from "@dashboard/core/today";
import { Button } from "@dashboard/ui/components/button";
import { Input } from "@dashboard/ui/components/input";
import { cn } from "@dashboard/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { NotebookPen, Plus, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useItemClick } from "#/components/item-detail/item-detail-provider";
import {
	ITEM_KINDS,
	ItemIcon,
	type ItemKind,
} from "#/components/source-kit/item-icon";
import { QueryState } from "#/components/widget-kit/query-state";
import {
	todayQueries,
	useAddToToday,
	useRemoveFromToday,
	useSetTodayDone,
} from "../queries";

/** Your list for the day: open items first, finished ones struck through. */
export function TodayList() {
	const query = useQuery(todayQueries.list());
	return (
		<div className="space-y-3">
			<AddNote />
			<QueryState
				query={query}
				isEmpty={(items) => items.length === 0}
				emptyMessage="Nothing planned yet. Add a note, or pin items with the calendar icon on any row."
			>
				{(items) => {
					const open = items.filter((i) => !i.done);
					const done = items.filter((i) => i.done);
					return (
						<div className="space-y-3">
							<ul className="divide-y divide-border">
								{open.map((item) => (
									<li key={item.id}>
										<TodayRow item={item} />
									</li>
								))}
							</ul>
							{done.length > 0 && (
								<div>
									<p className="px-1 text-xs font-medium text-muted-foreground">
										Done today ({done.length})
									</p>
									<ul className="divide-y divide-border">
										{done.map((item) => (
											<li key={item.id}>
												<TodayRow item={item} />
											</li>
										))}
									</ul>
								</div>
							)}
						</div>
					);
				}}
			</QueryState>
		</div>
	);
}

function AddNote() {
	const [title, setTitle] = useState("");
	const add = useAddToToday();
	const submit = (event: FormEvent) => {
		event.preventDefault();
		if (!title.trim()) return;
		add.mutate({ kind: "note", title }, { onSuccess: () => setTitle("") });
	};
	return (
		<form onSubmit={submit} className="flex gap-2">
			<label htmlFor="today-add" className="sr-only">
				Add to Today
			</label>
			<Input
				id="today-add"
				placeholder="Add a task or note for today…"
				value={title}
				onChange={(e) => setTitle(e.target.value)}
				autoComplete="off"
			/>
			<Button
				type="submit"
				size="sm"
				className="h-9"
				disabled={!title.trim() || add.isPending}
			>
				<Plus /> Add
			</Button>
		</form>
	);
}

const isItemKind = (kind: string): kind is ItemKind => kind in ITEM_KINDS;

function TodayRow({ item }: { item: TodayItem }) {
	const setDone = useSetTodayDone();
	const remove = useRemoveFromToday();
	const ref = item.ref;
	const onClick = useItemClick({
		source: ref?.source ?? "",
		title: item.title,
		url: ref?.url ?? "",
		detailRef: ref?.detailRef,
	});
	const checkboxId = `today-${item.id}`;

	return (
		<div className="group flex items-center gap-3 rounded-md px-1 py-2 hover:bg-accent/60">
			<input
				id={checkboxId}
				type="checkbox"
				checked={item.done}
				onChange={(e) =>
					setDone.mutate({ id: item.id, done: e.target.checked })
				}
				className="size-4 shrink-0 accent-primary"
				aria-label={`${item.done ? "Reopen" : "Finish"} "${item.title}"`}
			/>
			{ref && isItemKind(ref.itemKind) ? (
				<ItemIcon source={ref.source} kind={ref.itemKind} />
			) : (
				<span className="grid size-7 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
					<NotebookPen className="size-4" />
				</span>
			)}
			<div
				className={cn(
					"min-w-0 flex-1 text-sm",
					item.done && "text-muted-foreground line-through",
				)}
			>
				{ref ? (
					<a
						href={ref.url}
						target="_blank"
						rel="noreferrer"
						onClick={onClick}
						className="block truncate text-inherit no-underline underline-offset-2 hover:underline"
					>
						{item.title}
					</a>
				) : (
					<label htmlFor={checkboxId} className="block truncate">
						{item.title}
					</label>
				)}
			</div>
			<Button
				variant="ghost"
				size="icon"
				className="size-7 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
				aria-label={`Remove "${item.title}" from Today`}
				onClick={() => remove.mutate(item.id)}
			>
				<X />
			</Button>
		</div>
	);
}
