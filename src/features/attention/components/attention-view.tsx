import { useQuery } from "@tanstack/react-query";
import { QueryState } from "#/components/widget-kit/query-state";
import { attentionQueries } from "../queries";
import { AttentionList } from "./attention-list";

interface AttentionViewProps {
	/** Widget mode: at most a few items per group. */
	compact?: boolean;
}

/** Urgent items with data loading. Used by the /urgent page and the widget. */
export function AttentionView({ compact = false }: AttentionViewProps) {
	const query = useQuery(attentionQueries.all());
	return (
		<QueryState query={query}>
			{({ items, errors }) => (
				<AttentionList
					items={items}
					errors={errors}
					limit={compact ? 5 : undefined}
				/>
			)}
		</QueryState>
	);
}
