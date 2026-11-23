/** An entry on your personal list for the day. */
export interface TodayItem {
	id: string;
	kind: "note" | "item";
	title: string;
	/** Pinned items: what was pinned and how to open it again. */
	ref?: {
		source: string;
		/** ItemKind of the original row (pull_request, issue, email…). */
		itemKind: string;
		itemId: string;
		url: string;
		detailRef?: string;
	};
	done: boolean;
	doneAt: Date | null;
	createdAt: Date;
}

export type NewTodayItem = Pick<TodayItem, "kind" | "title" | "ref">;
