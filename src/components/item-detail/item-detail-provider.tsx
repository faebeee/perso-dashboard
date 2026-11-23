import { ExternalLink } from "lucide-react";
import {
	Component,
	type ErrorInfo,
	type MouseEvent,
	type ReactNode,
	useCallback,
	useMemo,
	useState,
} from "react";
import { useSources } from "#/components/source-kit/source-context";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "#/components/ui/dialog";
import {
	type ItemDetailApi,
	ItemDetailContext,
	type OpenableItem,
	useItemDetail,
} from "./item-detail-context";

/**
 * Owns the detail modal. Sources opt in through `IntegrationManifest.details`;
 * everything else keeps opening in the browser.
 */
export function ItemDetailProvider({
	openExternal,
	children,
}: {
	openExternal: (url: string) => void;
	children: ReactNode;
}) {
	const sources = useSources();
	const [current, setCurrent] = useState<OpenableItem | null>(null);

	const openItem = useCallback(
		(item: OpenableItem) => {
			if (!item.detailRef || !sources[item.source]?.details) return false;
			setCurrent(item);
			return true;
		},
		[sources],
	);
	const api = useMemo<ItemDetailApi>(
		() => ({ openItem, openExternal }),
		[openItem, openExternal],
	);

	const source = current ? sources[current.source] : undefined;
	const Body = source?.details?.Component;

	return (
		<ItemDetailContext.Provider value={api}>
			{children}
			<Dialog
				open={current !== null}
				onOpenChange={(open) => !open && setCurrent(null)}
			>
				<DialogContent className="flex max-h-[85vh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
					{current && Body && (
						<>
							<div className="border-b px-6 pt-5 pb-4 pr-12">
								<DialogDescription className="text-xs">
									{source?.name}
								</DialogDescription>
								<DialogTitle className="mt-0.5">{current.title}</DialogTitle>
							</div>
							<div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
								<DetailErrorBoundary key={current.detailRef}>
									<Body detailRef={current.detailRef ?? ""} />
								</DetailErrorBoundary>
							</div>
							<div className="flex justify-end gap-2 border-t px-6 py-3">
								<Button
									variant="outline"
									size="sm"
									onClick={() => openExternal(current.url)}
								>
									<ExternalLink /> Open in {source?.name ?? "browser"}
								</Button>
							</div>
						</>
					)}
				</DialogContent>
			</Dialog>
		</ItemDetailContext.Provider>
	);
}

/**
 * onClick for a row's link: plain clicks open the detail modal when the
 * source has one; modifier/middle clicks (and sources without one) fall
 * through to the browser.
 */
export function useItemClick(item: OpenableItem) {
	const { openItem } = useItemDetail();
	return (event: MouseEvent) => {
		if (
			event.button !== 0 ||
			event.metaKey ||
			event.ctrlKey ||
			event.shiftKey ||
			event.altKey
		) {
			return;
		}
		if (openItem(item)) event.preventDefault();
	};
}

/** A broken detail view must never take the app down. */
class DetailErrorBoundary extends Component<
	{ children: ReactNode },
	{ error: Error | null }
> {
	state = { error: null as Error | null };

	static getDerivedStateFromError(error: Error) {
		return { error };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error("Detail view crashed", error, info.componentStack);
	}

	render() {
		return this.state.error ? (
			<p className="text-sm text-destructive">
				Could not show details: {this.state.error.message}
			</p>
		) : (
			this.props.children
		);
	}
}
