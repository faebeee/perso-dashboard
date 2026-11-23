import type { MetricSeries, WeekRange } from "@dashboard/core/insights";
import { cn } from "@dashboard/ui/lib/utils";
import { useState } from "react";
import { formatMetric } from "../summary";

const weekLabel = new Intl.DateTimeFormat(undefined, {
	month: "short",
	day: "numeric",
});

const CHART_HEIGHT = 96;

/**
 * One series over the last weeks as columns (single hue, so no legend: the
 * card title names it). Marks: ≤24px wide, 4px rounded tops square at the
 * baseline, 2px gaps. The current week is partial: hatched and "so far".
 * Only the last complete week carries a value label; every bar has a
 * hover/focus tooltip, and the table view shows all values.
 */
export function MetricChart({
	series,
	weeks,
}: {
	series: MetricSeries;
	weeks: readonly WeekRange[];
}) {
	const [active, setActive] = useState<number | null>(null);
	const max = Math.max(0, ...series.values.map((v) => v ?? 0));
	const lastComplete = series.values.length - 2;

	const describe = (i: number) => {
		const week = weeks[i];
		const partial = i === series.values.length - 1;
		return `Week of ${week ? weekLabel.format(week.start) : "?"}: ${formatMetric(series.values[i], series)}${partial ? " so far" : ""}`;
	};

	return (
		<div className="relative">
			<div
				className="flex items-end gap-0.5 border-b border-border/70"
				style={{ height: CHART_HEIGHT }}
			>
				{series.values.map((value, i) => {
					const partial = i === series.values.length - 1;
					const height =
						max > 0 && value
							? Math.max(2, (value / max) * (CHART_HEIGHT - 18))
							: 0;
					return (
						<button
							// biome-ignore lint/suspicious/noArrayIndexKey: one slot per week, stable
							key={i}
							type="button"
							aria-label={`${series.label}, ${describe(i)}`}
							onMouseEnter={() => setActive(i)}
							onMouseLeave={() => setActive(null)}
							onFocus={() => setActive(i)}
							onBlur={() => setActive(null)}
							// The whole slot is the hit target, not just the painted bar.
							className="group/bar relative flex h-full flex-1 cursor-default flex-col items-center justify-end outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
						>
							{i === lastComplete && value !== null && (
								<span className="mb-0.5 text-[11px] font-medium text-foreground tabular-nums">
									{formatMetric(value, series)}
								</span>
							)}
							<span
								className={cn(
									"block w-full max-w-6 rounded-t-[4px] transition-opacity",
									!partial && "chart-bar bg-primary",
									active !== null && active !== i && "opacity-40",
								)}
								style={{
									height,
									...(partial
										? {
												// Tone-on-tone 45° hatch: this week isn't over yet.
												background:
													"repeating-linear-gradient(45deg, var(--primary) 0 2px, color-mix(in oklab, var(--primary) 35%, transparent) 2px 6px)",
											}
										: {}),
								}}
							/>
						</button>
					);
				})}
			</div>
			<div className="mt-1 flex gap-0.5 text-[10px] text-muted-foreground">
				{weeks.map((week, i) => (
					<span
						key={week.start.getTime()}
						className="flex-1 truncate text-center"
					>
						{i === weeks.length - 1 ? "This wk" : weekLabel.format(week.start)}
					</span>
				))}
			</div>
			{active !== null && (
				<div
					role="tooltip"
					className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-md border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground shadow-md"
					style={{
						left: `${((active + 0.5) / series.values.length) * 100}%`,
					}}
				>
					{describe(active)}
				</div>
			)}
		</div>
	);
}
