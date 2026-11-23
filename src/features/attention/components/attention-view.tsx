import { QueryState } from "#/components/widget-kit/query-state";
import { useAttention } from "../queries";
import { AttentionList } from "./attention-list";

interface AttentionViewProps {
	/** Widget mode: at most a few items per group. */
	compact?: boolean;
}

/** Urgent items with data loading. Used by the /urgent page and the widget. */
export function AttentionView({ compact = false }: AttentionViewProps) {
	const query = useAttention();
	return (
		<QueryState query={query}>
			{({ items, errors, hidden }) => (
				<AttentionList
					items={items}
					errors={errors}
					hidden={compact ? undefined : hidden}
					limit={compact ? 5 : undefined}
				/>
			)}
		</QueryState>
	);
}
