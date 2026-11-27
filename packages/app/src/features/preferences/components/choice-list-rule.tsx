import type { ChoiceListSetting } from "@dashboard/core/integration";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import { Input } from "@dashboard/ui/components/input";
import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { QueryState } from "#/components/widget-kit/query-state";
import { preferenceQueries } from "../queries";

/** Above this many options, a filter box helps find one. */
const FILTER_THRESHOLD = 8;

/** Checkboxes over the provider's options (e.g. your calendars, repos). */
export function ChoiceListRule({
	integrationId,
	setting,
	value,
	onChange,
}: {
	integrationId: string;
	setting: ChoiceListSetting;
	value: string[];
	onChange: (value: string[]) => void;
}) {
	const id = useId();
	const options = useQuery(
		preferenceQueries.settingOptions(integrationId, setting.key),
	);
	const [warning, setWarning] = useState<string | null>(null);
	const [filter, setFilter] = useState("");
	const min = setting.minSelected ?? 0;

	const toggle = (option: string, checked: boolean) => {
		const next = checked
			? [...value, option]
			: value.filter((v) => v !== option);
		if (next.length < min) {
			setWarning(`Keep at least ${min} selected.`);
			return;
		}
		setWarning(null);
		onChange(next);
	};

	return (
		<fieldset className="px-4 py-2.5">
			<legend className="text-sm">{setting.label}</legend>
			<p id={`${id}-hint`} className="text-xs text-muted-foreground">
				{setting.description}
			</p>
			<div className="mt-2">
				<QueryState
					query={options}
					isEmpty={(list) => list.length === 0}
					emptyMessage="Nothing to choose from."
				>
					{(list) => {
						const known = list.filter((o) => value.includes(o.value)).length;
						const needle = filter.trim().toLowerCase();
						const shown = needle
							? list.filter((o) =>
									`${o.label} ${o.description ?? ""}`
										.toLowerCase()
										.includes(needle),
								)
							: list;
						const all = setting.allWhenEmpty && value.length === 0;
						return (
							<>
								<div className="mb-1.5 flex items-center gap-2">
									<p className="flex-1 text-xs text-muted-foreground">
										{all
											? `None selected: all ${list.length} are included`
											: `${known} of ${list.length} selected`}
									</p>
									{setting.allWhenEmpty && value.length > 0 && (
										<Button
											variant="ghost"
											size="xs"
											onClick={() => {
												setWarning(null);
												onChange([]);
											}}
										>
											Include all
										</Button>
									)}
								</div>
								{list.length > FILTER_THRESHOLD && (
									<Input
										type="search"
										value={filter}
										onChange={(e) => setFilter(e.target.value)}
										placeholder={`Filter ${setting.label.toLowerCase()}…`}
										aria-label={`Filter ${setting.label.toLowerCase()}`}
										className="mb-1.5"
									/>
								)}
								{shown.length === 0 && (
									<p className="px-1.5 py-1.5 text-xs text-muted-foreground">
										No match.
									</p>
								)}
								<ul
									className={
										list.length > FILTER_THRESHOLD
											? "max-h-80 space-y-0.5 overflow-y-auto"
											: "space-y-0.5"
									}
								>
									{shown.map((option) => {
										const inputId = `${id}-${option.value}`;
										return (
											<li key={option.value}>
												<label
													htmlFor={inputId}
													className="flex cursor-pointer items-start gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-accent/60"
												>
													<input
														id={inputId}
														type="checkbox"
														className="mt-0.5 size-4 shrink-0 accent-primary"
														checked={value.includes(option.value)}
														onChange={(e) =>
															toggle(option.value, e.target.checked)
														}
														aria-describedby={`${id}-hint`}
													/>
													<span
														aria-hidden
														className="mt-1 size-2.5 shrink-0 rounded-full border"
														style={
															option.color
																? {
																		background: option.color,
																		borderColor: option.color,
																	}
																: undefined
														}
													/>
													<span className="min-w-0 flex-1">
														<span className="flex items-center gap-1.5 text-sm">
															<span className="truncate">{option.label}</span>
															{option.badge && (
																<Badge variant="secondary">
																	{option.badge}
																</Badge>
															)}
														</span>
														{option.description && (
															<span
																className="block truncate text-xs text-muted-foreground"
																title={option.description}
															>
																{option.description}
															</span>
														)}
													</span>
												</label>
											</li>
										);
									})}
								</ul>
							</>
						);
					}}
				</QueryState>
				{warning && (
					<p role="alert" className="mt-1 text-xs text-destructive">
						{warning}
					</p>
				)}
			</div>
		</fieldset>
	);
}
