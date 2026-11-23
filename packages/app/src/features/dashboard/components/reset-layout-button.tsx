import { Button } from "@dashboard/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@dashboard/ui/components/dialog";
import { RotateCcw } from "lucide-react";
import { useState } from "react";

interface ResetLayoutButtonProps {
	/** Already the default: nothing to reset. */
	disabled: boolean;
	onReset: () => void;
}

/** Restores the default layout, after a confirmation. */
export function ResetLayoutButton({
	disabled,
	onReset,
}: ResetLayoutButtonProps) {
	const [open, setOpen] = useState(false);

	return (
		<>
			<Button
				variant="ghost"
				size="sm"
				disabled={disabled}
				title={disabled ? "Already the default layout" : undefined}
				onClick={() => setOpen(true)}
			>
				<RotateCcw /> Reset layout
			</Button>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-w-md">
					<DialogTitle>Reset to the default layout?</DialogTitle>
					<DialogDescription>
						Your widgets, positions and sizes are replaced by the default
						dashboard. Widgets you added yourself are removed.
					</DialogDescription>
					<div className="mt-2 flex justify-end gap-2">
						<Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
							Cancel
						</Button>
						<Button
							size="sm"
							onClick={() => {
								onReset();
								setOpen(false);
							}}
						>
							Reset layout
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
