import {
	Link,
	Outlet,
	useLocation,
	useNavigate,
	useRouteContext,
	useRouter,
} from "@tanstack/react-router";
import { FileText, House, Settings, Shield } from "lucide-react";

import { Button } from "#/components/ui/button";
import { UserMenu } from "#/components/user-menu";
import { authClient } from "#/lib/auth-client";

export function AppShell() {
	const { pathname } = useLocation();
	const navigate = useNavigate();
	const router = useRouter();
	const { user } = useRouteContext({ from: "/_auth" });
	if (pathname === "/admin" || pathname.startsWith("/admin/")) {
		return <Outlet />;
	}

	return (
		<div className="min-h-screen">
			<header
				className="border-b border-[var(--line)] bg-[var(--header-bg)] backdrop-blur-lg"
				data-print-hidden
			>
				<nav
					aria-label="Primary navigation"
					className="page-wrap grid min-h-16 grid-cols-[1fr_auto] items-center gap-2 py-2 md:grid-cols-[1fr_auto_1fr] md:gap-4"
				>
					<Link
						className="inline-flex items-center gap-2 font-semibold text-[var(--sea-ink)] no-underline"
						to={user ? "/dashboard" : "/presets"}
					>
						<FileText aria-hidden="true" className="size-5" />
						Sheet Generator
					</Link>
					<div
						data-centered-navigation
						className="order-3 col-span-2 flex flex-wrap items-center justify-center gap-1 md:order-none md:col-span-1"
					>
						{user && (
							<Button asChild variant="ghost">
								<Link
									activeProps={{
										"aria-current": "page",
										className: "is-active",
									}}
									className="nav-link"
									to="/dashboard"
								>
									<House aria-hidden="true" />
									Home
								</Link>
							</Button>
						)}
						<Button asChild variant="ghost">
							<Link
								activeProps={{ "aria-current": "page", className: "is-active" }}
								className="nav-link"
								to="/presets"
							>
								<Settings aria-hidden="true" />
								Browse Presets
							</Link>
						</Button>
						{user?.role === "admin" && (
							<Button asChild variant="ghost">
								<Link
									activeProps={{
										"aria-current": "page",
										className: "is-active",
									}}
									className="nav-link"
									to="/admin"
								>
									<Shield aria-hidden="true" />
									Admin
								</Link>
							</Button>
						)}
					</div>
					<div className="justify-self-end">
						{user ? (
							<UserMenu
								user={user}
								onLogout={async () => {
									await authClient.signOut();
									router.options.context.queryClient.clear();
									await router.invalidate();
									await navigate({ to: "/login" });
								}}
							/>
						) : (
							<Button asChild>
								<Link to="/login">Sign in</Link>
							</Button>
						)}
					</div>
				</nav>
			</header>
			<Outlet />
		</div>
	);
}
