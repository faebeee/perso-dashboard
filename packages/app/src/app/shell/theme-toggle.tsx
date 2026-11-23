import {
	appearance,
	COLOR_MODES,
	useAppearance,
} from "@dashboard/ui/appearance/appearance";
import { Button } from "@dashboard/ui/components/button";
import { Monitor, Moon, Sun } from "lucide-react";

const ICONS = { system: Monitor, light: Sun, dark: Moon } as const;

/** Cycles System → Light → Dark. Themes are picked in Preferences. */
export function ThemeToggle() {
	const { mode } = useAppearance();
	const cycle = () =>
		appearance.setMode(
			COLOR_MODES[(COLOR_MODES.indexOf(mode) + 1) % COLOR_MODES.length] ??
				"system",
		);
	const Icon = ICONS[mode];
	return (
		<Button
			variant="ghost"
			size="sm"
			onClick={cycle}
			aria-label={`Color mode: ${mode}. Click to change.`}
			className="text-sidebar-foreground/80"
		>
			<Icon />
			<span className="hidden capitalize md:inline">{mode}</span>
		</Button>
	);
}
