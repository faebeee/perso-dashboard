import type { WidgetDefinition } from "@dashboard/core/widget";
import { Button } from "@dashboard/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@dashboard/ui/components/dropdown-menu";
import { Plus } from "lucide-react";
import { Fragment } from "react";

interface AddWidgetMenuProps {
	catalog: readonly WidgetDefinition[];
	groupLabel: (integrationId: string | undefined) => string;
	onAdd: (widget: WidgetDefinition) => void;
}

export function AddWidgetMenu({
	catalog,
	groupLabel,
	onAdd,
}: AddWidgetMenuProps) {
	const groups = Map.groupBy(catalog, (w) => w.integrationId);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button size="sm">
					<Plus /> Add widget
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-72">
				{[...groups].map(([integrationId, widgets], index) => (
					<Fragment key={integrationId ?? "core"}>
						{index > 0 && <DropdownMenuSeparator />}
						<DropdownMenuLabel>{groupLabel(integrationId)}</DropdownMenuLabel>
						{widgets.map((widget) => {
							const Icon = widget.icon;
							return (
								<DropdownMenuItem
									key={widget.type}
									onSelect={() => onAdd(widget)}
									className="items-start"
								>
									<Icon className="mt-0.5" />
									<div>
										<div className="font-medium">{widget.title}</div>
										<div className="text-xs text-muted-foreground">
											{widget.description}
										</div>
									</div>
								</DropdownMenuItem>
							);
						})}
					</Fragment>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
