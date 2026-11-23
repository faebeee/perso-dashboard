import {
	type QueryKey,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import { WorkItemList } from "#/components/work-item/work-item-list";
import type { WidgetDefinition } from "#/core/widget";
import type { WorkItem } from "#/core/work-item";
import type { WorkScope } from "#/core/work-scope";
import { QueryState } from "./query-state";
import { useWorkScope } from "./work-scope-context";

interface WorkItemWidgetOptions<TKey extends QueryKey>
	extends Omit<WidgetDefinition, "Component" | "defaultSize"> {
	/** Receives the active work scope; unscoped widgets can ignore it. */
	query: (
		scope: WorkScope,
	) => UseQueryOptions<WorkItem[], Error, WorkItem[], TKey>;
	emptyMessage?: string;
	defaultSize?: WidgetDefinition["defaultSize"];
}

/**
 * Most widgets are "a list of WorkItems from one query". This factory removes
 * that boilerplate: an integration only supplies metadata and a query.
 */
export function createWorkItemWidget<TKey extends QueryKey>({
	query,
	emptyMessage,
	defaultSize = { w: 4, h: 8 },
	...definition
}: WorkItemWidgetOptions<TKey>): WidgetDefinition {
	function WorkItemWidget() {
		const scope = useWorkScope();
		const result = useQuery(query(definition.scoped ? scope : "all"));
		return (
			<QueryState
				query={result}
				isEmpty={(items) => items.length === 0}
				emptyMessage={emptyMessage}
			>
				{(items) => <WorkItemList items={items} />}
			</QueryState>
		);
	}
	WorkItemWidget.displayName = `Widget(${definition.type})`;

	return {
		...definition,
		defaultSize,
		minSize: { w: 3, h: 4 },
		Component: WorkItemWidget,
	};
}
