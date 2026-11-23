import type { ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";

/** Small shared pieces for detail views: a label/value grid and people. */

export function MetaGrid({ children }: { children: ReactNode }) {
	return (
		<dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_1fr_max-content_1fr]">
			{children}
		</dl>
	);
}

export function Meta({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	return (
		<>
			<dt className="text-muted-foreground">{label}</dt>
			<dd className="min-w-0">{children}</dd>
		</>
	);
}

export function PersonChip({
	person,
	fallback = "—",
}: {
	person: { name: string; avatarUrl?: string } | null | undefined;
	fallback?: string;
}) {
	if (!person)
		return <span className="text-muted-foreground italic">{fallback}</span>;
	return (
		<span className="inline-flex max-w-full items-center gap-1.5">
			<Avatar className="size-5">
				{person.avatarUrl && <AvatarImage src={person.avatarUrl} alt="" />}
				<AvatarFallback className="text-[9px]">
					{person.name.slice(0, 2).toUpperCase()}
				</AvatarFallback>
			</Avatar>
			<span className="truncate">{person.name}</span>
		</span>
	);
}

export function DetailSection({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) {
	return (
		<section className="mt-6">
			<h3 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
				{title}
			</h3>
			{children}
		</section>
	);
}
