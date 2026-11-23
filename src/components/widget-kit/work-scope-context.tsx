import { createContext, type ReactNode, useContext } from "react";
import type { WorkScope } from "#/core/work-scope";

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
