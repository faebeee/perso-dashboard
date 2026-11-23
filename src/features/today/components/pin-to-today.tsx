import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, CalendarPlus } from "lucide-react";
import type { ActionableItem } from "#/components/item-actions/item-actions";
import { Button } from "#/components/ui/button";
import { todayQueries, useAddToToday } from "../queries";

/** Row action: put any item on your Today list. */
export function PinToTodayButton({ item }: { item: ActionableItem }) {
	const { data: today } = useQuery(todayQueries.list());
	const add = useAddToToday();
	const pinned = today?.some((t) => !t.done && t.ref?.itemId === item.id);

	return (
		<Button
			variant="ghost"
			size="icon"
			className="size-7"
			title={pinned ? "On your Today list" : "Add to Today"}
			aria-label={
				pinned ? `"${item.title}" is on Today` : `Add "${item.title}" to Today`
			}
			disabled={pinned || add.isPending}
			onClick={(event) => {
				event.preventDefault();
				event.stopPropagation();
				add.mutate({
					kind: "item",
					title: item.title,
					ref: {
						source: item.source,
						itemKind: item.kind,
						itemId: item.id,
						url: item.url,
						detailRef: item.detailRef,
						project: item.project,
					},
				});
			}}
		>
			{pinned ? <CalendarCheck className="text-primary" /> : <CalendarPlus />}
		</Button>
	);
}
