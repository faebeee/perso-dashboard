import { Link } from "@tanstack/react-router";
import { CloudOff, PauseCircle } from "lucide-react";
import { useSources } from "#/components/source-kit/source-context";
import {
	describeSync,
	useNow,
	useSyncSnapshot,
} from "#/components/widget-kit/sync-status";

/**
 * Sidebar footer: silent while everything syncs normally, a short warning
 * when an API is paused by its rate limit or the network is down.
 */
export function SyncIndicator() {
	const snapshot = useSyncSnapshot();
	const sources = useSources();
	const now = useNow();

	const problems = Object.entries(snapshot)
		.map(([id, state]) => ({ id, description: describeSync(state, now) }))
		.filter((p) => p.description && p.description.tone !== "ok");
	if (problems.length === 0) return null;

	const offline = problems.every((p) => p.description?.tone === "offline");
	const Icon = offline ? CloudOff : PauseCircle;
	const names = problems.map((p) => sources[p.id]?.name ?? p.id).join(", ");

	return (
		<Link
			to="/settings/integrations"
			className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-amber-600 no-underline hover:bg-sidebar-accent dark:text-amber-400"
			title={problems
				.map((p) => `${sources[p.id]?.name ?? p.id}: ${p.description?.text}`)
				.join("\n")}
		>
			<Icon className="size-4 shrink-0" />
			<span className="hidden truncate md:inline">
				{offline ? "Offline · cached data" : `${names} paused (rate limit)`}
			</span>
		</Link>
	);
}
