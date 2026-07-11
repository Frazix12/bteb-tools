import {
	Link,
	Outlet,
	useNavigate,
	useRouteContext,
	useRouter,
} from "@tanstack/react-router";
import { FileText, House, Settings, Shield } from "lucide-react";

import { Button } from "#/components/ui/button";
import { UserMenu } from "#/components/user-menu";
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
				<nav className="page-wrap grid grid-cols-[1fr_auto] items-center gap-3 py-3 md:grid-cols-[1fr_auto_1fr]">
					<Link
						className="inline-flex items-center gap-2 font-semibold text-[var(--sea-ink)] no-underline"
						to="/dashboard"
					>
						<FileText aria-hidden="true" className="size-5" />
						Sheet Generator
					</Link>
					<div
						data-centered-navigation
						className="order-3 col-span-2 flex flex-wrap items-center justify-center gap-1 md:order-none md:col-span-1"
					>
						<Button asChild variant="ghost">
							<Link to="/dashboard">
								<House aria-hidden="true" />
								Home
							</Link>
						</Button>
						<Button asChild variant="ghost">
							<Link to="/presets">
								<Settings aria-hidden="true" />
								Browse Presets
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
					</div>
					<div className="justify-self-end">
						<UserMenu
							user={user}
							onLogout={async () => {
								await authClient.signOut();
								router.options.context.queryClient.clear();
								await router.invalidate();
								await navigate({ to: "/login" });
							}}
						/>
					</div>
				</nav>
			</header>
			<Outlet />
		</div>
	);
}
