import { installExternalLinkHandler } from "@dashboard/app/external-links";
import { createAppRouter } from "@dashboard/app/router";
import { setHost } from "@dashboard/platform/host";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createTauriHost } from "./host/host";
import "./styles.css";

// Composition root: pick the host before anything touches the platform.
const router = createAppRouter();
const host = createTauriHost({
	navigate: (path) => void router.navigate({ to: path }),
});
setHost(host);
installExternalLinkHandler((url) => host.openExternal(url));

// Platform-specific styling (e.g. the macOS transparent title bar).
document.documentElement.dataset.platform = /Mac/.test(navigator.userAgent)
	? "macos"
	: "other";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing #root element");

createRoot(rootElement).render(
	<StrictMode>
		<RouterProvider router={router} />
	</StrictMode>,
);
