import type { MetricSeries } from "#/core/insights";
import { OUTLOOK_ID } from "./constants";

/** Pure: exact per-week counts from Graph → series. */
export function mailMetrics(counts: {
	received: number[];
	sent: number[];
}): MetricSeries[] {
	return [
		{
			id: `${OUTLOOK_ID}.received`,
			source: OUTLOOK_ID,
			label: "Emails received",
			unit: "count",
			description: "Messages that arrived in your Outlook inbox.",
			values: counts.received,
		},
		{
			id: `${OUTLOOK_ID}.sent`,
			source: OUTLOOK_ID,
			label: "Emails sent",
			unit: "count",
			description: "Messages you sent from Outlook.",
			values: counts.sent,
		},
	];
}
