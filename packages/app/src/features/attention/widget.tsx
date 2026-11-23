import type { WidgetDefinition } from "@dashboard/core/widget";
import { Siren } from "lucide-react";
import { AttentionView } from "./components/attention-view";

/** Built-in "Urgent" widget. */
export function createAttentionWidget(): WidgetDefinition {
	function AttentionWidget() {
		return <AttentionView compact />;
	}
	return {
		type: "core.attention",
		title: "Urgent",
		description:
			"What needs you soon: meetings, reviews, overdue issues, important mail.",
		icon: Siren,
		defaultSize: { w: 4, h: 10 },
		minSize: { w: 3, h: 5 },
		Component: AttentionWidget,
	};
}
