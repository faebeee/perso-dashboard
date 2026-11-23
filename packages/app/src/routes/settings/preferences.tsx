import { ThemePicker } from "@dashboard/ui/appearance/theme-picker";
import { createRoute } from "@tanstack/react-router";
import { PageHeader } from "#/app/shell/app-shell";
import { PreferencesPage } from "#/features/preferences/components/preferences-page";
import { RulesSection } from "#/features/preferences/components/rules-section";
import { rootRoute } from "../__root";

export const preferencesRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/settings/preferences",
	component: PreferencesRoute,
});

function PreferencesRoute() {
	return (
		<>
			<PageHeader
				title="Preferences"
				description="How the app behaves on this computer."
			/>
			<div className="space-y-8">
				<section className="space-y-3">
					<div>
						<h2 className="text-base font-semibold">Appearance</h2>
						<p className="text-sm text-muted-foreground">
							A theme and light or dark mode. Each theme has both.
						</p>
					</div>
					<ThemePicker />
				</section>
				<PreferencesPage />
				<section className="space-y-3">
					<div>
						<h2 className="text-base font-semibold">Rules</h2>
						<p className="text-sm text-muted-foreground">
							What counts as urgent or waiting. Changes apply right away.
						</p>
					</div>
					<RulesSection />
				</section>
			</div>
		</>
	);
}
