import { rootRoute } from "./__root";
import { appRoute } from "./app-overview";
import { dashboardRoute } from "./dashboard";
import { feedRoute } from "./feed";
import { insightsRoute } from "./insights";
import { reviewRoute } from "./review";
import { integrationsRoute } from "./settings/integrations";
import { preferencesRoute } from "./settings/preferences";
import { todayRoute } from "./today";
import { urgentRoute } from "./urgent";
import { waitingRoute } from "./waiting";

/**
 * Every page of the app, shared by the desktop and the web shell. Code-based
 * (not file-based) so both shells mount the very same tree without each
 * generating its own.
 */
export const routeTree = rootRoute.addChildren([
	dashboardRoute,
	todayRoute,
	reviewRoute,
	urgentRoute,
	waitingRoute,
	feedRoute,
	insightsRoute,
	appRoute,
	integrationsRoute,
	preferencesRoute,
]);
