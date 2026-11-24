import type { CalendarEvent } from "@dashboard/core/calendar-event";
import type { WorkItem } from "@dashboard/core/work-item";
import { createContext, type ReactNode, useContext } from "react";

export interface MeetingWithRelated {
	meeting: CalendarEvent;
	related: WorkItem[];
}

type RenderExtras = (prep: MeetingWithRelated) => ReactNode;

const MeetingExtrasContext = createContext<RenderExtras | null>(null);

/**
 * The app injects extras below a meeting's prep card (e.g. an AI briefing),
 * so the Waiting feature doesn't depend on the feature that renders them.
 */
export function MeetingExtrasProvider({
	render,
	children,
}: {
	render: RenderExtras;
	children: ReactNode;
}) {
	return (
		<MeetingExtrasContext.Provider value={render}>
			{children}
		</MeetingExtrasContext.Provider>
	);
}

export function MeetingExtras(prep: MeetingWithRelated) {
	const render = useContext(MeetingExtrasContext);
	return render ? render(prep) : null;
}
