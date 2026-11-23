import type { WidgetDefinition } from "@dashboard/core/widget";
import { ListTodo } from "lucide-react";
import { FeedView } from "./components/feed-view";

/** Built-in "My Work" widget. */
export function createFeedWidget(): WidgetDefinition {
	function FeedWidget() {
		return <FeedView compact />;
	}
	return {
		type: "core.feed",
		title: "My Work",
		description: "Everything from all connected integrations, newest first.",
		icon: ListTodo,
		defaultSize: { w: 4, h: 12 },
		minSize: { w: 3, h: 6 },
		Component: FeedWidget,
	};
}
