import { ThemePicker } from "@dashboard/ui/appearance/theme-picker";
import {
	createRoute,
	Link,
	notFound,
	Outlet,
	redirect,
} from "@tanstack/react-router";
import { Bell, Settings2, Sparkles } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { PageHeader } from "#/app/shell/app-shell";
import { LlmSettings } from "#/features/ai-summary/components/llm-settings";
import { GeneralSettings } from "#/features/preferences/components/general-settings";
import { IntegrationSettings } from "#/features/preferences/components/integration-settings";
import { RulesSection } from "#/features/preferences/components/rules-section";
import { getIntegrationManifest } from "#/integrations/registry";
import {
	getIntegrationBackend,
	integrationBackends,
} from "#/integrations/runtime-registry";
import { rootRoute } from "../__root";

/** Preferences: a sub-nav on the left, one small page on the right. */
export const preferencesRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/settings/preferences",
	component: PreferencesLayout,
});

const preferencesIndexRoute = createRoute({
	getParentRoute: () => preferencesRoute,
	path: "/",
	beforeLoad: () => {
		throw redirect({ to: "/settings/preferences/general", replace: true });
	},
});

const generalRoute = createRoute({
	getParentRoute: () => preferencesRoute,
	path: "general",
	component: () => (
		<Page title="General" description="How the app behaves on this computer.">
			<Section
				title="Appearance"
				description="A theme and light or dark mode. Each theme has both."
			>
				<ThemePicker />
			</Section>
			<Section
				title="Behaviour"
				description="Startup, notifications and your workday."
			>
				<GeneralSettings />
			</Section>
		</Page>
	),
});

const rulesRoute = createRoute({
	getParentRoute: () => preferencesRoute,
	path: "rules",
	component: () => (
		<Page
			title="Urgent & Waiting"
			description="What counts as urgent or waiting. Changes apply right away."
		>
			<RulesSection />
		</Page>
	),
});

const aiRoute = createRoute({
	getParentRoute: () => preferencesRoute,
	path: "ai",
	component: () => (
		<Page
			title="AI"
			description="The language model behind the AI summary, weekly report, triage and meeting briefings."
		>
			<LlmSettings />
		</Page>
	),
});

/** One page per integration that declares settings (e.g. GitHub repositories). */
const integrationSettingsRoute = createRoute({
	getParentRoute: () => preferencesRoute,
	path: "$integrationId",
	loader: ({ params }) => {
		if (!getIntegrationBackend(params.integrationId)?.settings?.length) {
			throw notFound();
		}
	},
	component: IntegrationSettingsRoute,
});

function IntegrationSettingsRoute() {
	const { integrationId } = integrationSettingsRoute.useParams();
	const backend = getIntegrationBackend(integrationId);
	if (!backend) return null;
	const name = nameOf(integrationId);
	return (
		<Page
			key={integrationId}
			title={name}
			description={`Choose what ${name} brings into the app. Changes apply right away.`}
		>
			<IntegrationSettings backend={backend} />
		</Page>
	);
}

export const preferencesRouteTree = preferencesRoute.addChildren([
	preferencesIndexRoute,
	generalRoute,
	rulesRoute,
	aiRoute,
	integrationSettingsRoute,
]);

const nameOf = (id: string) => getIntegrationManifest(id)?.name ?? id;

const PAGES = [
	{ to: "/settings/preferences/general", label: "General", icon: Settings2 },
	{ to: "/settings/preferences/rules", label: "Urgent & Waiting", icon: Bell },
	{ to: "/settings/preferences/ai", label: "AI", icon: Sparkles },
] as const;

/** Integrations with settings, in registry order. */
const INTEGRATION_PAGES = integrationBackends
	.filter((b) => b.settings?.length)
	.map((b) => ({
		id: b.id,
		label: nameOf(b.id),
		icon: getIntegrationManifest(b.id)?.icon,
	}));

const SUBNAV_LINK =
	"flex shrink-0 items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground no-underline hover:bg-accent hover:text-accent-foreground data-[status=active]:bg-accent data-[status=active]:font-medium data-[status=active]:text-accent-foreground";

function PreferencesLayout() {
	return (
		<>
			<PageHeader title="Preferences" />
			<div className="flex flex-col gap-6 md:flex-row md:items-start">
				<nav
					aria-label="Preferences"
					className="flex gap-1 overflow-x-auto md:sticky md:top-0 md:w-48 md:shrink-0 md:flex-col md:overflow-visible"
				>
					{PAGES.map((page) => (
						<SubNavLink key={page.to} icon={page.icon} label={page.label}>
							{(props) => <Link to={page.to} {...props} />}
						</SubNavLink>
					))}
					{INTEGRATION_PAGES.length > 0 && (
						<>
							<p className="mt-4 mb-1 hidden px-2 text-[11px] font-semibold tracking-wide text-muted-foreground/70 uppercase md:block">
								Integrations
							</p>
							<span className="mx-1 w-px shrink-0 bg-border md:hidden" />
							{INTEGRATION_PAGES.map((page) => (
								<SubNavLink key={page.id} icon={page.icon} label={page.label}>
									{(props) => (
										<Link
											to="/settings/preferences/$integrationId"
											params={{ integrationId: page.id }}
											{...props}
										/>
									)}
								</SubNavLink>
							))}
						</>
					)}
				</nav>
				<div className="min-w-0 flex-1">
					<Outlet />
				</div>
			</div>
		</>
	);
}

/** Shared look of the sub-nav links; the caller picks the typed route. */
function SubNavLink({
	icon: Icon,
	label,
	children,
}: {
	icon?: ComponentType<{ className?: string }>;
	label: string;
	children: (props: { className: string; children: ReactNode }) => ReactNode;
}) {
	return children({
		className: SUBNAV_LINK,
		children: (
			<>
				{Icon && <Icon className="size-4" />}
				<span>{label}</span>
			</>
		),
	});
}

function Page({
	title,
	description,
	children,
}: {
	title: string;
	description: string;
	children: ReactNode;
}) {
	return (
		<div className="max-w-2xl space-y-6">
			<header>
				<h2 className="text-lg font-semibold">{title}</h2>
				<p className="text-sm text-muted-foreground">{description}</p>
			</header>
			{children}
		</div>
	);
}

function Section({
	title,
	description,
	children,
}: {
	title: string;
	description: string;
	children: ReactNode;
}) {
	return (
		<section className="space-y-3">
			<div>
				<h3 className="text-base font-semibold">{title}</h3>
				<p className="text-sm text-muted-foreground">{description}</p>
			</div>
			{children}
		</section>
	);
}
