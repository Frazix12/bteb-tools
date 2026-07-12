import {
	Link,
	Outlet,
	useLocation,
	useNavigate,
	useRouteContext,
	useRouter,
} from "@tanstack/react-router";
import {
	ArrowLeft,
	FileText,
	Gauge,
	KeyRound,
	Menu,
	Settings,
	Users,
	X,
} from "lucide-react";
import { Dialog } from "radix-ui";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { UserMenu } from "#/components/user-menu";
import { ThemeToggle } from "#/features/theme/theme-toggle";
import { authClient } from "#/lib/auth-client";

const destinations = [
	{ label: "Overview", to: "/admin", icon: Gauge },
	{ label: "Users", to: "/admin/users", icon: Users },
	{ label: "Usage", to: "/admin/usage", icon: Gauge },
	{ label: "AI keys", to: "/admin/ai-keys", icon: KeyRound },
	{ label: "Documents", to: "/admin/documents", icon: FileText },
	{ label: "Presets", to: "/admin/presets", icon: Settings },
] as const;

function AdminNavigation({ onSelect }: { onSelect?: () => void }) {
	const { pathname } = useLocation();

	return (
		<nav aria-label="Admin navigation" className="grid gap-1">
			{destinations.map(({ label, to, icon: Icon }) => (
				<Link
					aria-current={pathname === to ? "page" : undefined}
					className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground no-underline transition-colors hover:bg-accent hover:text-foreground aria-[current=page]:bg-accent aria-[current=page]:text-foreground"
					key={to}
					onClick={onSelect}
					to={to === "/admin" ? to : (to as "/admin")}
				>
					<Icon aria-hidden="true" className="size-4" />
					{label}
				</Link>
			))}
		</nav>
	);
}

export function AdminShell() {
	const [mobileOpen, setMobileOpen] = useState(false);
	const navigate = useNavigate();
	const router = useRouter();
	const { user } = useRouteContext({ from: "/_auth/admin" });
	const logout = async () => {
		await authClient.signOut();
		router.options.context.queryClient.clear();
		await router.invalidate();
		await navigate({ to: "/login" });
	};

	return (
		<div className="min-h-screen bg-background lg:grid lg:grid-cols-[17rem_1fr]">
			<aside className="hidden border-r border-[var(--line)] bg-[var(--surface-strong)] p-4 lg:flex lg:flex-col">
				<Link
					className="mb-6 flex items-center gap-2 px-3 font-semibold no-underline"
					to="/admin"
				>
					<Settings aria-hidden="true" className="size-5" />
					Administration
				</Link>
				<AdminNavigation />
				<div className="mt-auto grid gap-3 border-t border-[var(--line)] pt-4">
					<ThemeToggle />
					<div className="flex items-center justify-between gap-2">
						<Link
							className="inline-flex items-center gap-2 text-sm font-medium no-underline"
							to="/dashboard"
						>
							<ArrowLeft aria-hidden="true" className="size-4" />
							Back to site
						</Link>
						<UserMenu user={user} onLogout={logout} />
					</div>
				</div>
			</aside>

			<div className="min-w-0">
				<header className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 lg:hidden">
					<Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
						<Dialog.Trigger asChild>
							<Button
								aria-label="Open admin navigation"
								size="icon"
								variant="ghost"
							>
								<Menu aria-hidden="true" />
							</Button>
						</Dialog.Trigger>
						<Dialog.Portal>
							<Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
							<Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-[min(20rem,85vw)] flex-col bg-[var(--surface-strong)] p-4 shadow-xl">
								<div className="mb-6 flex items-center justify-between">
									<Dialog.Title className="font-semibold">
										Administration
									</Dialog.Title>
									<Dialog.Close asChild>
										<Button
											aria-label="Close admin navigation"
											size="icon"
											variant="ghost"
										>
											<X aria-hidden="true" />
										</Button>
									</Dialog.Close>
								</div>
								<AdminNavigation onSelect={() => setMobileOpen(false)} />
								<div className="mt-auto grid gap-4 border-t border-[var(--line)] pt-4">
									<ThemeToggle />
									<Link
										className="inline-flex items-center gap-2 text-sm font-medium no-underline"
										onClick={() => setMobileOpen(false)}
										to="/dashboard"
									>
										<ArrowLeft aria-hidden="true" className="size-4" />
										Back to site
									</Link>
								</div>
							</Dialog.Content>
						</Dialog.Portal>
					</Dialog.Root>
					<span className="font-semibold">Administration</span>
					<UserMenu user={user} onLogout={logout} />
				</header>
				<main>
					<Outlet />
				</main>
			</div>
		</div>
	);
}
