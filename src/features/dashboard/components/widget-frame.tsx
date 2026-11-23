import { CircleHelp, GripVertical, X } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "#/components/ui/button";
import { useWorkScope } from "#/components/widget-kit/work-scope-context";
import type { WidgetDefinition } from "#/core/widget";
import { WORK_SCOPE_LABELS } from "#/core/work-scope";
import { cn } from "#/lib/utils";
import { DRAG_HANDLE_CLASS } from "./dashboard-grid";

interface WidgetFrameProps {
	/** undefined when a saved layout references a widget that no longer exists. */
	definition: WidgetDefinition | undefined;
	editing: boolean;
	onRemove: () => void;
}

/** Card chrome around any widget: header, drag handle, isolation. */
export function WidgetFrame({
	definition,
	editing,
	onRemove,
}: WidgetFrameProps) {
	const scope = useWorkScope();
	const Icon = definition?.icon ?? CircleHelp;
	const Body = definition?.Component;

	return (
		<section
			className={cn(
				"flex h-full flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-xs",
				editing && "ring-2 ring-ring/40",
			)}
			aria-label={definition?.title ?? "Unknown widget"}
		>
			<header
				className={cn(
					"flex items-center gap-2 border-b px-3 py-2",
					editing && `${DRAG_HANDLE_CLASS} cursor-grab active:cursor-grabbing`,
				)}
			>
				{editing && <GripVertical className="size-4 text-muted-foreground" />}
				<Icon className="size-4 text-muted-foreground" />
				<h2 className="flex-1 truncate text-sm font-semibold">
					{definition?.title ?? "Unknown widget"}
				</h2>
				{definition?.scoped && scope !== "all" && (
					<span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
						{WORK_SCOPE_LABELS[scope]}
					</span>
				)}
				{editing && (
					<Button
						variant="ghost"
						size="icon"
						className="size-6"
						aria-label="Remove widget"
						// Don't start a drag when pressing the button.
						onMouseDown={(e) => e.stopPropagation()}
						onClick={onRemove}
					>
						<X />
					</Button>
				)}
			</header>

			<div className="min-h-0 flex-1 overflow-y-auto px-2 py-1">
				{Body ? (
					<WidgetErrorBoundary>
						<Body />
					</WidgetErrorBoundary>
				) : (
					<p className="p-4 text-sm text-muted-foreground">
						This widget is no longer available (its integration may have been
						removed). Remove it in edit mode.
					</p>
				)}
			</div>
		</section>
	);
}

/** One crashing widget must never take down the whole dashboard. */
class WidgetErrorBoundary extends Component<
	{ children: ReactNode },
	{ error: Error | null }
> {
	state = { error: null as Error | null };

	static getDerivedStateFromError(error: Error) {
		return { error };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error("Widget crashed", error, info.componentStack);
	}

	render() {
		if (this.state.error) {
			return (
				<div className="p-4 text-sm text-destructive">
					This widget crashed: {this.state.error.message}
				</div>
			);
		}
		return this.props.children;
	}
}
