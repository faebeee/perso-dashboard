import { createContext, type ReactNode, useContext } from "react";
import type { OpenableItem } from "#/components/item-detail/item-detail-context";
import type { ItemKind } from "#/components/source-kit/item-icon";
import { cn } from "#/lib/utils";

/** Enough about a row's item for actions like "Add to Today". */
export interface ActionableItem extends OpenableItem {
	id: string;
	kind: ItemKind;
	project?: string;
}

type RenderActions = (item: ActionableItem) => ReactNode;

const ItemActionsContext = createContext<RenderActions | null>(null);

/**
 * The app injects per-row actions (e.g. the Today feature's pin button) so
 * shared lists don't depend on features.
 */
export function ItemActionsProvider({
	render,
	children,
}: {
	render: RenderActions;
	children: ReactNode;
}) {
	return (
		<ItemActionsContext.Provider value={render}>
			{children}
		</ItemActionsContext.Provider>
	);
}

/** Row action buttons: shown on hover or keyboard focus. */
export function RowActions({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100",
				className,
			)}
		>
			{children}
		</div>
	);
}

/** Renders the injected actions for one item (nothing when none are provided). */
export function InjectedItemActions({ item }: { item: ActionableItem }) {
	const render = useContext(ItemActionsContext);
	return render ? render(item) : null;
}
