import { createFileRoute } from "@tanstack/react-router";
import { ListChecks, Siren } from "lucide-react";
import type { ReactNode } from "react";
import { PageHeader } from "#/app/shell/app-shell";
import { AttentionView } from "#/features/attention/components/attention-view";
import { useAttention } from "#/features/attention/queries";
import { BriefingView } from "#/features/today/components/briefing-view";
import { TodayList } from "#/features/today/components/today-list";

export const Route = createFileRoute("/today")({
	component: TodayRoute,
});

const dateFormat = new Intl.DateTimeFormat(undefined, {
	weekday: "long",
	day: "numeric",
	month: "long",
});

function greeting(hour: number) {
	if (hour < 12) return "Good morning";
	if (hour < 18) return "Good afternoon";
	return "Good evening";
}

function TodayRoute() {
	const attention = useAttention();
	const now = new Date();
	return (
		<>
			<PageHeader
				title={greeting(now.getHours())}
				description={`${dateFormat.format(now)} · your day at a glance`}
			/>
			<BriefingView urgent={attention.data?.items}>
				<Card title="Your list" icon={ListChecks}>
					<TodayList />
				</Card>
				<Card title="Needs you" icon={Siren}>
					<AttentionView compact />
				</Card>
			</BriefingView>
		</>
	);
}

function Card({
	title,
	icon: Icon,
	children,
}: {
	title: string;
	icon: React.ComponentType<{ className?: string }>;
	children: ReactNode;
}) {
	return (
		<section className="rounded-xl border bg-card shadow-xs" aria-label={title}>
			<header className="flex items-center gap-2 border-b px-4 py-2.5">
				<Icon className="size-4 text-muted-foreground" />
				<h2 className="text-sm font-semibold">{title}</h2>
			</header>
			<div className="px-3 py-3">{children}</div>
		</section>
	);
}
