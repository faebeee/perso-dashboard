import { themeInitScript } from "@dashboard/ui/appearance/theme-init";
import { HeadContent, Scripts } from "@tanstack/react-router";
import type { ReactNode } from "react";
import appCss from "./styles.css?url";

/** The HTML document around the shared app (the desktop uses index.html). */
export function Document({ children }: { children: ReactNode }) {
	return (
		// The theme script sets classes on <html> before React hydrates.
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body>
				<div id="root">{children}</div>
				<Scripts />
			</body>
		</html>
	);
}

export const documentHead = () => ({
	meta: [
		{ charSet: "utf-8" },
		{ name: "viewport", content: "width=device-width, initial-scale=1" },
		{ title: "Productivity Dashboard" },
	],
	links: [
		{ rel: "stylesheet", href: appCss },
		{ rel: "icon", type: "image/png", href: "/favicon.png" },
	],
	// Applies the stored theme before first paint (no flash of the wrong theme).
	scripts: [{ children: themeInitScript }],
});
