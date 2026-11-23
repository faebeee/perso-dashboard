import { Button } from "@dashboard/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@dashboard/ui/components/dialog";
import { Input } from "@dashboard/ui/components/input";
import { CalendarPlus } from "lucide-react";
import {
	createContext,
	type FormEvent,
	type ReactNode,
	useCallback,
	useContext,
	useState,
} from "react";
import { useAddToToday } from "../queries";

const QuickCaptureContext = createContext<() => void>(() => {});

/** Opens the "add to Today" dialog (global shortcut, ⌘K, buttons). */
export const useOpenQuickCapture = () => useContext(QuickCaptureContext);

export function QuickCaptureProvider({ children }: { children: ReactNode }) {
	const [open, setOpen] = useState(false);
	const openCapture = useCallback(() => setOpen(true), []);
	return (
		<QuickCaptureContext.Provider value={openCapture}>
			{children}
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-w-lg">
					{open && <CaptureForm onDone={() => setOpen(false)} />}
				</DialogContent>
			</Dialog>
		</QuickCaptureContext.Provider>
	);
}

function CaptureForm({ onDone }: { onDone: () => void }) {
	const [title, setTitle] = useState("");
	const add = useAddToToday();
	const submit = (event: FormEvent) => {
		event.preventDefault();
		if (!title.trim()) return;
		add.mutate({ kind: "note", title }, { onSuccess: onDone });
	};
	return (
		<form onSubmit={submit} className="space-y-3">
			<div>
				<DialogTitle className="flex items-center gap-2">
					<CalendarPlus className="size-5" /> Add to Today
				</DialogTitle>
				<DialogDescription>
					Press Enter to save, Esc to cancel.
				</DialogDescription>
			</div>
			<label htmlFor="quick-capture" className="sr-only">
				What do you need to do?
			</label>
			<Input
				id="quick-capture"
				autoFocus
				autoComplete="off"
				placeholder="What do you need to do?"
				value={title}
				onChange={(e) => setTitle(e.target.value)}
			/>
			{add.error && (
				<p className="text-xs text-destructive">{add.error.message}</p>
			)}
			<div className="flex justify-end">
				<Button
					type="submit"
					size="sm"
					disabled={!title.trim() || add.isPending}
				>
					Add
				</Button>
			</div>
		</form>
	);
}
