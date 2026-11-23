import { expireCachedData } from "@dashboard/platform/services";
import { appearance } from "@dashboard/ui/appearance/appearance";
import { THEMES } from "@dashboard/ui/appearance/themes";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Command } from "cmdk";
import {
	CalendarPlus,
	ChartColumn,
	History,
	Hourglass,
	LayoutDashboard,
	ListTodo,
	Moon,
	Palette,
	PlugZap,
	RefreshCw,
	Search,
	Settings2,
	Siren,
	Sun,
} from "lucide-react";
import {
	type ComponentType,
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import {
	type OpenableItem,
	useItemDetail,
} from "#/components/item-detail/item-detail-context";
import { ItemIcon } from "#/components/source-kit/item-icon";
import { useSources } from "#/components/source-kit/source-context";
import { KIND_FOR_REASON } from "#/features/attention/kinds";
import { useAttention } from "#/features/attention/queries";
import { feedQueries } from "#/features/feed/queries";
import { releaseQueries } from "#/features/releases/queries";
import { useAddToToday } from "#/features/today/queries";
import { integrationManifests } from "#/integrations/registry";

/**
 * ⌘K / Ctrl+K: jump to any page or search everything already loaded
 * (urgent items, My Work, releases). Composition lives in `app/` because it
 * spans several features.
 */

const PaletteContext = createContext<() => void>(() => {});

/** Opens the palette, e.g. from the sidebar's search button. */
export const useOpenCommandPalette = () => useContext(PaletteContext);

const PAGES: {
	to: string;
	label: string;
	icon: ComponentType<{ className?: string }>;
}[] = [
	{ to: "/today", label: "Today", icon: Sun },
	{ to: "/review", label: "Daily review (standup)", icon: History },
	{ to: "/urgent", label: "Urgent", icon: Siren },
	{ to: "/waiting", label: "Waiting", icon: Hourglass },
	{ to: "/", label: "Dashboard", icon: LayoutDashboard },
	{ to: "/feed", label: "My Work", icon: ListTodo },
	{ to: "/insights", label: "Insights", icon: ChartColumn },
	...integrationManifests
		.filter((m) => m.overview)
		.map((m) => ({ to: `/apps/${m.id}`, label: m.name, icon: m.icon })),
	{ to: "/settings/integrations", label: "Integrations", icon: PlugZap },
	{ to: "/settings/preferences", label: "Preferences", icon: Settings2 },
];

const MAX_PER_GROUP = 50;

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
	const [open, setOpen] = useState(false);
	const openPalette = useCallback(() => setOpen(true), []);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
				event.preventDefault();
				setOpen((value) => !value);
			}
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, []);

	return (
		<PaletteContext.Provider value={openPalette}>
			{children}
			<Command.Dialog
				open={open}
				onOpenChange={setOpen}
				label="Search"
				overlayClassName="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
				contentClassName="fixed top-[12vh] left-1/2 z-50 w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-2xl"
			>
				{open && <PaletteContent close={() => setOpen(false)} />}
			</Command.Dialog>
		</PaletteContext.Provider>
	);
}

function PaletteContent({ close }: { close: () => void }) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { openItem, openExternal } = useItemDetail();
	const sources = useSources();
	// Usually already cached; only fetched here if the user never opened them.
	const urgent = useAttention();
	const feed = useQuery(feedQueries.all());
	const releases = useQuery(releaseQueries.all());
	const loading = urgent.isPending || feed.isPending || releases.isPending;
	const [search, setSearch] = useState("");
	const addToToday = useAddToToday();

	const run = (action: () => void) => {
		close();
		action();
	};
	const openLink = (url: string) => run(() => openExternal(url));
	/** Detail modal when the source has one, browser otherwise. */
	const openAny = (item: OpenableItem) =>
		run(() => {
			if (!openItem(item)) openExternal(item.url);
		});

	const nameOf = (source: string) => sources[source]?.name ?? source;
	const urgentUrls = useMemo(
		() => new Set(urgent.data?.items.map((i) => i.url)),
		[urgent.data],
	);

	return (
		<>
			<div className="flex items-center gap-2 border-b px-3">
				<Search className="size-4 shrink-0 text-muted-foreground" />
				<Command.Input
					autoFocus
					value={search}
					onValueChange={setSearch}
					placeholder="Search pages, PRs, issues, mail, releases…"
					className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
				/>
				<kbd className="hidden rounded border px-1.5 text-[10px] text-muted-foreground sm:block">
					esc
				</kbd>
			</div>
			<Command.List className="max-h-[min(60vh,480px)] overflow-y-auto p-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
				<Command.Empty className="py-8 text-center text-sm text-muted-foreground">
					{loading ? "Loading…" : "No results."}
				</Command.Empty>

				{search.trim() && (
					<Command.Group heading="Today">
						<PaletteItem
							value={`add to today ${search}`}
							forceMount
							onSelect={() =>
								run(() => addToToday.mutate({ kind: "note", title: search }))
							}
						>
							<span className="grid size-7 place-items-center rounded-md bg-muted">
								<CalendarPlus className="size-4" />
							</span>
							<Label
								title={`Add “${search.trim()}” to Today`}
								detail="New note on your Today list"
							/>
						</PaletteItem>
					</Command.Group>
				)}

				<Command.Group heading="Go to">
					{PAGES.map(({ to, label, icon: Icon }) => (
						<PaletteItem
							key={to}
							value={`page ${label}`}
							onSelect={() => run(() => navigate({ to }))}
						>
							<span className="grid size-7 place-items-center rounded-md bg-muted">
								<Icon className="size-4" />
							</span>
							{label}
						</PaletteItem>
					))}
					<PaletteItem
						value="action refresh reload all data"
						onSelect={() =>
							run(async () => {
								await expireCachedData();
								await queryClient.invalidateQueries();
							})
						}
					>
						<span className="grid size-7 place-items-center rounded-md bg-muted">
							<RefreshCw className="size-4" />
						</span>
						Refresh all data
					</PaletteItem>
				</Command.Group>

				<Command.Group heading="Appearance">
					{THEMES.map((theme) => (
						<PaletteItem
							key={theme.id}
							value={`theme appearance ${theme.name} ${theme.description}`}
							onSelect={() => run(() => appearance.setTheme(theme.id))}
						>
							<span className="grid size-7 place-items-center rounded-md bg-muted">
								<Palette className="size-4" />
							</span>
							<Label
								title={`Theme: ${theme.name}`}
								detail={theme.description}
							/>
						</PaletteItem>
					))}
					<PaletteItem
						value="appearance dark light mode toggle"
						onSelect={() =>
							run(() =>
								appearance.setMode(
									document.documentElement.classList.contains("dark")
										? "light"
										: "dark",
								),
							)
						}
					>
						<span className="grid size-7 place-items-center rounded-md bg-muted">
							<Moon className="size-4" />
						</span>
						<Label
							title="Toggle dark mode"
							detail="Switch between light and dark"
						/>
					</PaletteItem>
				</Command.Group>

				{urgent.data && urgent.data.items.length > 0 && (
					<Command.Group heading="Urgent">
						{urgent.data.items.slice(0, MAX_PER_GROUP).map((item) => (
							<PaletteItem
								key={item.id}
								value={`urgent ${item.id} ${item.title} ${item.context ?? ""} ${nameOf(item.source)}`}
								onSelect={() => openAny(item)}
							>
								<ItemIcon
									source={item.source}
									kind={KIND_FOR_REASON[item.reason]}
								/>
								<Label
									title={item.title}
									detail={`${nameOf(item.source)} · ${item.label}`}
								/>
							</PaletteItem>
						))}
					</Command.Group>
				)}

				{feed.data && feed.data.items.length > 0 && (
					<Command.Group heading="My Work">
						{feed.data.items
							.filter((item) => !urgentUrls.has(item.url))
							.slice(0, MAX_PER_GROUP)
							.map((item) => (
								<PaletteItem
									key={item.id}
									value={`work ${item.id} ${item.title} ${item.context ?? ""} ${item.actor?.name ?? ""} ${nameOf(item.source)}`}
									onSelect={() => openAny(item)}
								>
									<ItemIcon source={item.source} kind={item.kind} />
									<Label
										title={item.title}
										detail={[nameOf(item.source), item.context]
											.filter(Boolean)
											.join(" · ")}
									/>
								</PaletteItem>
							))}
					</Command.Group>
				)}

				{releases.data && releases.data.items.length > 0 && (
					<Command.Group heading="Releases">
						{releases.data.items.slice(0, MAX_PER_GROUP).map((release) => (
							<PaletteItem
								key={release.id}
								value={`release ${release.id} ${release.name} ${release.project} ${nameOf(release.source)}`}
								onSelect={() => openLink(release.url)}
							>
								<ItemIcon source={release.source} kind="release" />
								<Label
									title={release.name}
									detail={`${nameOf(release.source)} · ${release.project}`}
								/>
							</PaletteItem>
						))}
					</Command.Group>
				)}
			</Command.List>
		</>
	);
}

function PaletteItem({
	value,
	onSelect,
	forceMount,
	children,
}: {
	value: string;
	onSelect: () => void;
	/** Show regardless of the search filter. */
	forceMount?: boolean;
	children: ReactNode;
}) {
	return (
		<Command.Item
			value={value}
			onSelect={onSelect}
			forceMount={forceMount}
			className="flex cursor-default items-center gap-3 rounded-md px-2 py-1.5 text-sm select-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
		>
			{children}
		</Command.Item>
	);
}

function Label({ title, detail }: { title: string; detail: string }) {
	return (
		<span className="min-w-0 flex-1">
			<span className="block truncate">{title}</span>
			<span className="block truncate text-xs text-muted-foreground">
				{detail}
			</span>
		</span>
	);
}
