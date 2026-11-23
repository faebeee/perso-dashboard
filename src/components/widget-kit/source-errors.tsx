import { CircleAlert } from "lucide-react";
import type { IntegrationError } from "#/core/result";

interface SourceErrorsProps {
	errors: IntegrationError[];
	/** Display name per integration id. */
	nameOf: (integrationId: string | undefined) => string | undefined;
}

/** Compact chips for sources that failed while the others still loaded. */
export function SourceErrors({ errors, nameOf }: SourceErrorsProps) {
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
					{nameOf(error.integrationId) ?? error.integrationId}:{" "}
					{error.kind.replace("_", " ")}
				</span>
			))}
		</div>
	);
}
