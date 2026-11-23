import { Check } from "lucide-react";
import { cn } from "#/lib/utils";
import { appearance, COLOR_MODES, useAppearance } from "./appearance";
import { THEMES, type ThemeInfo } from "./themes";

/** Theme cards with live miniature previews, plus the light/dark mode. */
export function ThemePicker() {
	const { theme, mode } = useAppearance();
	const dark =
		mode === "dark" ||
		(mode === "system" && document.documentElement.classList.contains("dark"));

	return (
		<div className="space-y-4">
			<fieldset className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				<legend className="sr-only">Theme</legend>
				{THEMES.map((info) => (
					<ThemeCard
						key={info.id}
						info={info}
						dark={dark}
						selected={theme === info.id}
						onSelect={() => appearance.setTheme(info.id)}
					/>
				))}
			</fieldset>
			<fieldset
				className="inline-flex rounded-lg border bg-muted/40 p-0.5"
				aria-label="Color mode"
			>
				{COLOR_MODES.map((m) => (
					<button
						key={m}
						type="button"
						aria-pressed={mode === m}
						onClick={() => appearance.setMode(m)}
						className={cn(
							"rounded-md px-3 py-1 text-sm capitalize",
							mode === m
								? "bg-background shadow-xs"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						{m}
					</button>
				))}
			</fieldset>
		</div>
	);
}

function ThemeCard({
	info,
	dark,
	selected,
	onSelect,
}: {
	info: ThemeInfo;
	dark: boolean;
	selected: boolean;
	onSelect: () => void;
}) {
	const c = dark ? info.dark : info.light;
	const texture =
		info.texture === "dots"
			? `radial-gradient(circle, color-mix(in oklab, ${c.foreground} 16%, transparent) 1px, transparent 1.4px) 0 0 / 9px 9px`
			: info.texture === "grid"
				? `linear-gradient(color-mix(in oklab, ${c.foreground} 9%, transparent) 1px, transparent 1px) 0 0 / 12px 12px, linear-gradient(90deg, color-mix(in oklab, ${c.foreground} 9%, transparent) 1px, transparent 1px) 0 0 / 12px 12px`
				: undefined;

	return (
		<label
			className={cn(
				"group cursor-pointer overflow-hidden rounded-xl border bg-card text-left shadow-xs transition-shadow has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50",
				selected ? "ring-2 ring-primary" : "hover:border-foreground/30",
			)}
		>
			<input
				type="radio"
				name="theme"
				value={info.id}
				checked={selected}
				onChange={onSelect}
				className="sr-only"
			/>
			{/* Miniature of the app in this theme (decorative). */}
			<div
				aria-hidden
				className="flex h-28 gap-2 p-2"
				style={{
					background: texture ? `${texture}, ${c.background}` : c.background,
					fontFamily: info.font,
				}}
			>
				<div
					className="flex w-8 flex-col gap-1.5 rounded p-1"
					style={{ background: c.muted, borderRadius: info.radius }}
				>
					<span
						className="h-1.5 rounded-full"
						style={{ background: c.primary }}
					/>
					<span
						className="h-1.5 rounded-full opacity-40"
						style={{ background: c.foreground }}
					/>
					<span
						className="h-1.5 rounded-full opacity-40"
						style={{ background: c.foreground }}
					/>
				</div>
				<div
					className="flex flex-1 flex-col justify-between p-2"
					style={{
						background: c.card,
						color: c.foreground,
						borderRadius: info.radius,
						border: `1px solid color-mix(in oklab, ${c.foreground} 12%, transparent)`,
					}}
				>
					<span
						className="text-2xl leading-none font-bold"
						style={{
							fontFamily: info.displayFont,
							textTransform: info.id === "dot" ? "uppercase" : undefined,
						}}
					>
						12:30
					</span>
					<span className="flex items-center gap-1.5 text-[10px]">
						<span
							className="size-1.5 rounded-full"
							style={{ background: c.accent }}
						/>
						Standup in 5m
					</span>
					<span
						className="self-start px-2 py-0.5 text-[10px]"
						style={{
							background: c.primary,
							color: c.card,
							borderRadius: info.radius,
						}}
					>
						Join
					</span>
				</div>
			</div>
			<div className="flex items-start gap-2 border-t p-3">
				<div className="min-w-0 flex-1">
					<p className="text-sm font-semibold">{info.name}</p>
					<p className="text-xs text-muted-foreground">{info.description}</p>
				</div>
				{selected && <Check className="size-4 shrink-0 text-primary" />}
			</div>
		</label>
	);
}
