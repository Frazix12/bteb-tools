import {
	Link,
	Outlet,
	useNavigate,
	useRouteContext,
	useRouter,
} from "@tanstack/react-router";
import {
	FileText,
	LayoutDashboard,
	LogOut,
	Settings,
	Shield,
} from "lucide-react";

import { Button } from "#/components/ui/button";
import { authClient } from "#/lib/auth-client";

export function AppShell() {
	const navigate = useNavigate();
	const router = useRouter();
	const { user } = useRouteContext({ from: "/_auth" });

	return (
		<div className="min-h-screen">
			<header
				className="border-b border-[var(--line)] bg-[var(--header-bg)] backdrop-blur-lg"
				data-print-hidden
			>
				<nav className="page-wrap flex flex-wrap items-center justify-between gap-4 py-3">
					<Link
						className="inline-flex items-center gap-2 font-semibold text-[var(--sea-ink)] no-underline"
						to="/dashboard"
					>
						<FileText aria-hidden="true" className="size-5" />
						Sheet Generator
					</Link>
					<div className="flex flex-wrap items-center gap-2">
						<Button asChild variant="ghost">
							<Link to="/dashboard">
								<LayoutDashboard aria-hidden="true" />
								Dashboard
							</Link>
						</Button>
						<Button asChild variant="ghost">
							<Link to="/presets">
								<Settings aria-hidden="true" />
								Presets
							</Link>
						</Button>
						{user.role === "admin" && (
							<Button asChild variant="ghost">
								<Link to="/admin">
									<Shield aria-hidden="true" />
									Admin
								</Link>
							</Button>
						)}
						<Button
							onClick={async () => {
								await authClient.signOut();
								router.options.context.queryClient.clear();
								await router.invalidate();
								await navigate({ to: "/login" });
							}}
							variant="outline"
						>
							<LogOut aria-hidden="true" />
							Sign out
						</Button>
					</div>
				</nav>
			</header>
			<Outlet />
		</div>
	);
}
