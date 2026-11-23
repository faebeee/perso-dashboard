import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "#/app/shell/app-shell";
import { PreferencesPage } from "#/features/preferences/components/preferences-page";

export const Route = createFileRoute("/settings/preferences")({
	component: PreferencesRoute,
});

function PreferencesRoute() {
	return (
		<>
			<PageHeader
				title="Preferences"
				description="How the app behaves on this computer."
			/>
			<PreferencesPage />
		</>
	);
}
