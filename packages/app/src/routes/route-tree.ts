import { rootRoute } from "./__root";
import { appRoute } from "./app-overview";
import { dashboardRoute } from "./dashboard";
import { feedRoute } from "./feed";
import { insightsRoute } from "./insights";
import { reviewRoute } from "./review";
import { integrationsRoute } from "./settings/integrations";
import { preferencesRoute } from "./settings/preferences";
import { streamRoute } from "./stream";
import { todayRoute } from "./today";
import { urgentRoute } from "./urgent";
import { waitingRoute } from "./waiting";

/**
 * Every page of the app. Code-based (not file-based), so any shell mounts
 * the very same tree without generating its own.
 */
export const routeTree = rootRoute.addChildren([
	dashboardRoute,
	todayRoute,
	reviewRoute,
	urgentRoute,
	waitingRoute,
	feedRoute,
	streamRoute,
	insightsRoute,
	appRoute,
	integrationsRoute,
	preferencesRoute,
]);
