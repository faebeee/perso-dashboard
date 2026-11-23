import { ListTodo } from "lucide-react";
import type { IntegrationManifest } from "#/core/integration";
import type { WidgetDefinition } from "#/core/widget";
import { FeedView } from "./components/feed-view";

/** Built-in "My Work" widget. Receives the integrations it should label. */
export function createFeedWidget(
	integrations: readonly IntegrationManifest[],
): WidgetDefinition {
	function FeedWidget() {
		return <FeedView integrations={integrations} compact />;
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
