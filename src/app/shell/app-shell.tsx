import { Link } from "@tanstack/react-router";
import {
	Hourglass,
	LayoutDashboard,
	ListTodo,
	PlugZap,
	Search,
	Settings2,
	Siren,
	Sun,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { integrationManifests } from "#/integrations/registry";
import { useOpenCommandPalette } from "../command-palette";
import { ThemeToggle } from "./theme-toggle";
import { UrgentCount } from "./urgent-count";

const MAIN_NAV = [
	{ to: "/today", label: "Today", icon: Sun },
	{ to: "/urgent", label: "Urgent", icon: Siren, badge: UrgentCount },
	{ to: "/waiting", label: "Waiting", icon: Hourglass },
	{ to: "/", label: "Dashboard", icon: LayoutDashboard },
	{ to: "/feed", label: "My Work", icon: ListTodo },
] as const;

/** One entry per integration that ships an overview page. */
const SOURCES = integrationManifests.filter((m) => m.overview);

/** The app's only scroll container (the document itself never scrolls). */
export const MAIN_SCROLL_ID = "main";

const LINK_CLASS =
	"flex shrink-0 items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/80 no-underline hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:font-medium data-[status=active]:text-sidebar-accent-foreground";

export function AppShell({ children }: { children: ReactNode }) {
	const openPalette = useOpenCommandPalette();
	return (
		// Fixed frame: the shell fills the window, only <main> scrolls.
		<div className="flex h-full flex-col overflow-hidden md:flex-row">
			{/* macOS: the title bar is transparent; this strip keeps the window draggable. */}
			<div
				data-tauri-drag-region
				className="fixed inset-x-0 top-0 z-40 hidden h-7 macos:block"
			/>
			<aside className="flex shrink-0 items-center gap-1 border-b bg-sidebar px-3 py-2 select-none macos:pt-8 md:w-56 md:flex-col md:items-stretch md:overflow-y-auto md:border-r md:border-b-0 md:px-3 md:py-4 macos:md:pt-10">
				<div className="mr-2 flex items-center gap-2 px-2 font-semibold md:mr-0 md:mb-6">
					<span className="grid size-7 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
						PD
					</span>
					<span className="hidden md:inline">Productivity</span>
				</div>

				<button
					type="button"
					onClick={openPalette}
					className="flex shrink-0 items-center gap-2 rounded-md border bg-background/60 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground md:mb-3"
					title="Search (⌘K)"
				>
					<Search className="size-4" />
					<span className="hidden flex-1 text-left md:inline">Search</span>
					<kbd className="hidden text-[10px] md:inline">⌘K</kbd>
				</button>

				<nav
					className="flex min-w-0 flex-1 gap-1 overflow-x-auto md:flex-none md:flex-col md:overflow-visible"
					aria-label="Main"
				>
					{MAIN_NAV.map((item) => (
						<NavLink
							key={item.to}
							to={item.to}
							label={item.label}
							icon={item.icon}
							badge={"badge" in item ? item.badge : undefined}
						/>
					))}

					{SOURCES.length > 0 && (
						<>
							<p className="mt-5 mb-1 hidden px-2 text-[11px] font-semibold tracking-wide text-sidebar-foreground/50 uppercase md:block">
								Sources
							</p>
							<span className="mx-1 w-px shrink-0 bg-border md:hidden" />
							{SOURCES.map(({ id, name, icon: Icon }) => (
								<Link
									key={id}
									to="/apps/$integrationId"
									params={{ integrationId: id }}
									className={LINK_CLASS}
									title={name}
								>
									<Icon className="size-4" />
									<span className="hidden sm:inline">{name}</span>
								</Link>
							))}
						</>
					)}
				</nav>

				<div className="flex items-center gap-1 md:mt-auto md:flex-col md:items-stretch">
					<NavLink
						to="/settings/integrations"
						label="Integrations"
						icon={PlugZap}
					/>
					<NavLink
						to="/settings/preferences"
						label="Preferences"
						icon={Settings2}
					/>
					<ThemeToggle />
				</div>
			</aside>

			<main
				id={MAIN_SCROLL_ID}
				data-scroll-restoration-id={MAIN_SCROLL_ID}
				className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 md:px-8 macos:md:pt-10"
			>
				{children}
			</main>
		</div>
	);
}

function NavLink({
	to,
	label,
	icon: Icon,
	badge: Badge,
}: {
	to:
		| "/"
		| "/today"
		| "/urgent"
		| "/waiting"
		| "/feed"
		| "/settings/integrations"
		| "/settings/preferences";
	label: string;
	icon: ComponentType<{ className?: string }>;
	/** Rendered at the end of the link, e.g. a live count. */
	badge?: ComponentType;
}) {
	return (
		<Link
			to={to}
			activeOptions={{ exact: to === "/" }}
			className={LINK_CLASS}
			title={label}
		>
			<Icon className="size-4" />
			<span className="hidden sm:inline">{label}</span>
			{Badge && <Badge />}
		</Link>
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
