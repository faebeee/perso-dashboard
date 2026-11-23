import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import { THEME_STORAGE_KEY as STORAGE_KEY } from "./theme-init";

type Theme = "light" | "dark" | "system";
const ORDER: Theme[] = ["system", "light", "dark"];

function applyTheme(theme: Theme) {
	const dark =
		theme === "dark" ||
		(theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
	document.documentElement.classList.toggle("dark", dark);
}

export function ThemeToggle() {
	const [theme, setTheme] = useState<Theme>("system");

	useEffect(() => {
		try {
			const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
			if (stored && ORDER.includes(stored)) setTheme(stored);
		} catch {
			// storage unavailable: stay on "system"
		}
	}, []);

	const cycle = () => {
		const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length] ?? "system";
		setTheme(next);
		applyTheme(next);
		try {
			localStorage.setItem(STORAGE_KEY, next);
		} catch {
			// ignore
		}
	};

	const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
	return (
		<Button
			variant="ghost"
			size="sm"
			onClick={cycle}
			aria-label={`Theme: ${theme}. Click to change.`}
			className="text-sidebar-foreground/80"
		>
			<Icon />
			<span className="hidden capitalize md:inline">{theme}</span>
		</Button>
	);
}
