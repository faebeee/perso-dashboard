import { CircleUser, Layers, PenLine } from "lucide-react";
import { Button } from "#/components/ui/button";
import {
	WORK_SCOPE_LABELS,
	type WorkScope,
	workScopeSchema,
} from "#/core/work-scope";

const ICONS = { all: Layers, assigned: CircleUser, created: PenLine } as const;

interface WorkScopeToggleProps {
	value: WorkScope;
	onChange: (scope: WorkScope) => void;
}

/** Segmented control: All / Assigned to me / Created by me. */
export function WorkScopeToggle({ value, onChange }: WorkScopeToggleProps) {
	return (
		<fieldset
			className="inline-flex rounded-lg border bg-muted/40 p-0.5"
			aria-label="Show work"
		>
			{workScopeSchema.options.map((scope) => {
				const Icon = ICONS[scope];
				const active = scope === value;
				return (
					<Button
						key={scope}
						size="sm"
						variant={active ? "secondary" : "ghost"}
						aria-pressed={active}
						className={
							active ? "bg-background shadow-xs" : "text-muted-foreground"
						}
						onClick={() => onChange(scope)}
					>
						<Icon />
						{WORK_SCOPE_LABELS[scope]}
					</Button>
				);
			})}
		</fieldset>
	);
}
