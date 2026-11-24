import type { ComponentType, ReactNode } from "react";

/** A titled panel of the Daily Review page. */
export function Card({
	title,
	icon: Icon,
	action,
	children,
}: {
	title: string;
	icon: ComponentType<{ className?: string }>;
	action?: ReactNode;
	children: ReactNode;
}) {
	return (
		<section aria-label={title} className="rounded-xl border bg-card shadow-xs">
			<header className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
				<Icon className="size-4 text-muted-foreground" />
				<h2 className="flex-1 text-sm font-semibold">{title}</h2>
				{action}
			</header>
			<div className="px-4 py-3">{children}</div>
		</section>
	);
}
