import { createFileRoute, useLocation } from "@tanstack/react-router";
import { NewIndexSheet } from "#/features/presets/new-index-sheet";

export const Route = createFileRoute("/_auth/index-sheet/new")({
	validateSearch: (search) => ({
		preset: typeof search.preset === "string" ? search.preset : undefined,
	}),
	component: IndexSheetRoute,
});

function IndexSheetRoute() {
	const { preset } = Route.useSearch();
	const { user } = Route.useRouteContext();
	const location = useLocation();
	return (
		<NewIndexSheet
			isAuthenticated={Boolean(user)}
			signInRedirect={location.href}
			preset={preset}
		/>
	);
}
