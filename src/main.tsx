import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { installExternalLinkHandler } from "./app/external-links";
import { setHost } from "./platform/host";
import { createTauriHost } from "./platform/tauri/host";
import { getRouter } from "./router";
import "./styles.css";

// Composition root: pick the host before anything touches the platform.
const host = createTauriHost();
setHost(host);
installExternalLinkHandler((url) => host.openExternal(url));

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing #root element");

createRoot(rootElement).render(
	<StrictMode>
		<RouterProvider router={getRouter()} />
	</StrictMode>,
);
