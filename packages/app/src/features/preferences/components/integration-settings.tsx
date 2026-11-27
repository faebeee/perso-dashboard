import {
	type IntegrationBackend,
	stringListSetting,
} from "@dashboard/core/integration";
import {
	integrationSettingsFor,
	preferences,
	setIntegrationSetting,
} from "@dashboard/platform/preferences";
import { useSyncExternalStore } from "react";
import { ChoiceListRule } from "./choice-list-rule";
import { ListRule, useRefreshAfterRuleChange } from "./rule-kit";

/** The settings an integration declares (e.g. GitHub repositories). */
export function IntegrationSettings({
	backend,
}: {
	backend: IntegrationBackend;
}) {
	const prefs = useSyncExternalStore(preferences.subscribe, preferences.get);
	const refresh = useRefreshAfterRuleChange();

	return (
		<div className="divide-y rounded-xl border bg-card shadow-xs">
			{(backend.settings ?? []).map((setting) => {
				const value = stringListSetting(
					integrationSettingsFor(backend, prefs),
					setting,
				);
				const save = (next: string[]) => {
					setIntegrationSetting(
						backend.id,
						setting.key,
						next.length > 0 ? next : setting.default,
					);
					void refresh();
				};
				return setting.type === "choice-list" ? (
					<ChoiceListRule
						key={setting.key}
						integrationId={backend.id}
						setting={setting}
						value={value}
						onChange={save}
					/>
				) : (
					<ListRule
						key={setting.key}
						label={setting.label}
						hint={setting.description}
						caseSensitive
						value={value}
						onCommit={(next) => {
							save(next);
							return true;
						}}
					/>
				);
			})}
		</div>
	);
}
