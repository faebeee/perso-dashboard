import type { WorkScope } from "@dashboard/core/work-scope";
import { createContext, type ReactNode, useContext } from "react";

const WorkScopeContext = createContext<WorkScope>("all");

/** Provided by the dashboard; read by scope-aware widgets. */
export function WorkScopeProvider({
	scope,
	children,
}: {
	scope: WorkScope;
	children: ReactNode;
}) {
	return (
		<WorkScopeContext.Provider value={scope}>
			{children}
		</WorkScopeContext.Provider>
	);
}

export function useWorkScope(): WorkScope {
	return useContext(WorkScopeContext);
}
