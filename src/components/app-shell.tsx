import { Link, Outlet, useNavigate, useRouter } from "@tanstack/react-router";
import { FileText } from "lucide-react";

import { Button } from "#/components/ui/button";
import { authClient } from "#/lib/auth-client";

export function AppShell() {
	const navigate = useNavigate();
	const router = useRouter();

	return (
		<div className="min-h-screen">
			<header
				className="border-b border-[var(--line)] bg-[var(--header-bg)] backdrop-blur-lg"
				data-print-hidden
			>
				<nav className="page-wrap flex items-center justify-between gap-4 py-3">
					<Link
						className="inline-flex items-center gap-2 font-semibold text-[var(--sea-ink)] no-underline"
						to="/dashboard"
					>
						<FileText aria-hidden="true" className="size-5" />
						Sheet Generator
					</Link>
					<Button
						onClick={async () => {
							await authClient.signOut();
							router.options.context.queryClient.clear();
							await router.invalidate();
							await navigate({ to: "/login" });
						}}
						variant="outline"
					>
						Sign out
					</Button>
				</nav>
			</header>
			<Outlet />
		</div>
	);
}
