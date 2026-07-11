import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/admin")({
	beforeLoad: ({ context }) => {
		if (context.user.role !== "admin") throw redirect({ to: "/dashboard" });
	},
	component: AdminPage,
});

function AdminPage() {
	return <h1>Admin</h1>;
}
