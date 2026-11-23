import { useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "#/components/ui/button";
import { WorkScopeProvider } from "#/components/widget-kit/work-scope-context";
import { WorkScopeToggle } from "#/components/widget-kit/work-scope-toggle";
import type { WidgetDefinition } from "#/core/widget";
import type { WorkScope } from "#/core/work-scope";
import { queryKeys } from "#/lib/query-keys";
import { expireCachedData } from "#/platform/services";
import {
	addWidget,
	applyPositions,
	removeWidget,
	samePositions,
} from "../model";
import { useDashboardLayout } from "../use-dashboard-layout";
import { AddWidgetMenu } from "./add-widget-menu";
import { DashboardGrid } from "./dashboard-grid";
import { WidgetFrame } from "./widget-frame";

interface DashboardPageProps {
	/** Every widget type the user may place. Injected by the app layer. */
	catalog: readonly WidgetDefinition[];
	groupLabel: (integrationId: string | undefined) => string;
	/** Controlled so the app can keep it in the URL. */
	scope: WorkScope;
	onScopeChange: (scope: WorkScope) => void;
}

export function DashboardPage({
	catalog,
	groupLabel,
	scope,
	onScopeChange,
}: DashboardPageProps) {
	const { layout, setLayout, isSaving } = useDashboardLayout(catalog);
	const [editing, setEditing] = useState(false);
	const queryClient = useQueryClient();

	const byType = useMemo(
		() => new Map(catalog.map((widget) => [widget.type, widget])),
		[catalog],
	);

	const refreshAll = async () => {
		await expireCachedData();
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: queryKeys.integrations }),
			queryClient.invalidateQueries({ queryKey: queryKeys.combined }),
		]);
	};

	return (
		<WorkScopeProvider scope={scope}>
			<div className="space-y-4">
				<div className="flex flex-wrap items-center gap-2">
					<WorkScopeToggle value={scope} onChange={onScopeChange} />
					<div className="ml-auto flex flex-wrap items-center gap-2">
						{isSaving && (
							<span className="text-xs text-muted-foreground">Saving…</span>
						)}
						<Button variant="ghost" size="sm" onClick={refreshAll}>
							<RefreshCw /> Refresh
						</Button>
						{editing && (
							<AddWidgetMenu
								catalog={catalog}
								groupLabel={groupLabel}
								onAdd={(widget) => setLayout(addWidget(layout, widget))}
							/>
						)}
						<Button
							variant={editing ? "default" : "outline"}
							size="sm"
							onClick={() => setEditing(!editing)}
						>
							{editing ? <Check /> : <Pencil />}
							{editing ? "Done" : "Edit layout"}
						</Button>
					</div>
				</div>

				{layout.length === 0 ? (
					<div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
						Your dashboard is empty. Click <strong>Edit layout</strong> and add
						a widget.
					</div>
				) : (
					<DashboardGrid
						items={layout}
						editing={editing}
						minSizeOf={(item) => byType.get(item.type)?.minSize}
						onPositionsChange={(positions) => {
							const next = applyPositions(layout, positions);
							if (!samePositions(next, layout)) setLayout(next);
						}}
						renderItem={(item) => (
							<WidgetFrame
								definition={byType.get(item.type)}
								editing={editing}
								onRemove={() => setLayout(removeWidget(layout, item.i))}
							/>
						)}
					/>
				)}
			</div>
		</WorkScopeProvider>
	);
}
