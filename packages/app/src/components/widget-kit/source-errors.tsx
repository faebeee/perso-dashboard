import type { IntegrationError } from "@dashboard/core/result";
import { CircleAlert } from "lucide-react";
import { useSources } from "#/components/source-kit/source-context";

interface SourceErrorsProps {
	errors: IntegrationError[];
}

/** Compact chips for sources that failed while the others still loaded. */
export function SourceErrors({ errors }: SourceErrorsProps) {
	const sources = useSources();
	if (errors.length === 0) return null;
	return (
		<div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
			{errors.map((error) => (
				<span
					key={error.integrationId}
					className="inline-flex items-center gap-1 rounded-md border border-destructive/30 px-2 py-1"
					title={error.message}
				>
					<CircleAlert className="size-3.5 text-destructive" />
					{(error.integrationId && sources[error.integrationId]?.name) ??
						error.integrationId}
					: {error.kind.replace("_", " ")}
				</span>
			))}
		</div>
	);
}
