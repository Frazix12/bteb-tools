import { createFileRoute } from "@tanstack/react-router";

import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";

export const Route = createFileRoute("/_auth/dashboard")({
	component: DashboardPlaceholder,
});

function DashboardPlaceholder() {
	const { user } = Route.useRouteContext();
	return (
		<main className="page-wrap py-10">
			<Card className="border-[var(--line)] bg-[var(--surface-strong)]">
				<CardHeader>
					<CardTitle>Welcome, {user.name}</CardTitle>
					<CardDescription>
						Create your first document. Saved-document management arrives in the
						dashboard milestone.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-wrap gap-3">
					<Button asChild>
						<a href="/index-sheet/new">New Index Sheet</a>
					</Button>
					<Button asChild variant="outline">
						<a href="/cover-page/new">New Cover Page</a>
					</Button>
				</CardContent>
			</Card>
		</main>
	);
}
