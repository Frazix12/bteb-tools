import { createFileRoute, useLocation } from "@tanstack/react-router";
import { NewCoverPage } from "#/features/presets/new-cover-page";

export const Route = createFileRoute("/_auth/cover-page/new")({
	validateSearch: (search) => ({
		preset: typeof search.preset === "string" ? search.preset : undefined,
	}),
	component: CoverPageRoute,
});

function CoverPageRoute() {
	const { preset } = Route.useSearch();
	const { user } = Route.useRouteContext();
	const location = useLocation();
	return (
		<NewCoverPage
			isAuthenticated={Boolean(user)}
			signInRedirect={location.href}
			preset={preset}
		/>
	);
}
