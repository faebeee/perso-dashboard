import { Link } from "@tanstack/react-router";
import { LayoutDashboard, ListTodo, PlugZap } from "lucide-react";
import type { ReactNode } from "react";
import { ThemeToggle } from "./theme-toggle";

const NAV = [
	{ to: "/", label: "Dashboard", icon: LayoutDashboard },
	{ to: "/feed", label: "My Work", icon: ListTodo },
	{ to: "/settings/integrations", label: "Integrations", icon: PlugZap },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
	return (
		<div className="flex min-h-dvh flex-col md:flex-row">
			<aside className="flex shrink-0 items-center gap-1 border-b bg-sidebar px-3 py-2 md:w-56 md:flex-col md:items-stretch md:border-r md:border-b-0 md:px-3 md:py-4">
				<div className="mr-auto flex items-center gap-2 px-2 font-semibold md:mr-0 md:mb-6">
					<span className="grid size-7 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
						PD
					</span>
					<span className="hidden sm:inline">Productivity</span>
				</div>

				<nav className="flex gap-1 md:flex-col" aria-label="Main">
					{NAV.map(({ to, label, icon: Icon }) => (
						<Link
							key={to}
							to={to}
							activeOptions={{ exact: to === "/" }}
							className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/80 no-underline hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:font-medium data-[status=active]:text-sidebar-accent-foreground"
						>
							<Icon className="size-4" />
							<span className="hidden sm:inline">{label}</span>
						</Link>
					))}
				</nav>

				<div className="md:mt-auto">
					<ThemeToggle />
				</div>
			</aside>

			<main className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>
		</div>
	);
}

export function PageHeader({
	title,
	description,
}: {
	title: string;
	description?: string;
}) {
	return (
		<header className="mb-6">
			<h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
			{description && (
				<p className="mt-1 text-sm text-muted-foreground">{description}</p>
			)}
		</header>
	);
}
