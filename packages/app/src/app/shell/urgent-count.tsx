import { cn } from "@dashboard/ui/lib/utils";
import { useAttention } from "#/features/attention/queries";

/** Live count for the sidebar; red when something needs you right now. */
export function UrgentCount() {
	const { data } = useAttention();
	const count = data?.items.length ?? 0;
	if (count === 0) return null;
	const now = data?.items.some((item) => item.urgency === "now");
	return (
		<span
			className={cn(
				"ml-auto min-w-5 rounded-full px-1.5 text-center text-[11px] leading-5 font-semibold tabular-nums",
				now
					? "bg-destructive text-white"
					: "bg-sidebar-accent text-sidebar-accent-foreground",
			)}
		>
			{count > 99 ? "99+" : count}
			<span className="sr-only"> urgent item{count === 1 ? "" : "s"}</span>
		</span>
	);
}
