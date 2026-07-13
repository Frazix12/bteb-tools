import { createFileRoute } from "@tanstack/react-router";
import { PresetsPage } from "#/features/presets/presets-page";

export const Route = createFileRoute("/_auth/presets")({
	component: RouteComponent,
});

function RouteComponent() {
	const { user } = Route.useRouteContext();
	return <PresetsPage user={user} />;
}
