import { LogOut, UserRound } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { Button } from "#/components/ui/button";
import { ThemeToggle } from "#/features/theme/theme-toggle";

export function UserMenu({
	user,
	onLogout,
}: {
	user: { name: string; email: string; image?: string | null };
	onLogout: () => void;
}) {
	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger asChild>
				<Button
					aria-label="Open user menu"
					className="size-10 rounded-full border-[var(--chip-line)] bg-[var(--chip-bg)] p-0"
					variant="outline"
				>
					{user.image ? (
						<img
							alt=""
							className="size-9 rounded-full object-cover"
							src={user.image}
						/>
					) : (
						<UserRound aria-hidden="true" className="size-5" />
					)}
				</Button>
			</DropdownMenu.Trigger>
			<DropdownMenu.Portal>
				<DropdownMenu.Content
					align="end"
					className="z-50 min-w-64 rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] p-2 shadow-xl backdrop-blur-xl"
					sideOffset={8}
				>
					<div className="px-3 py-2">
						<p className="font-semibold text-[var(--sea-ink)]">{user.name}</p>
						<p className="truncate text-sm text-muted-foreground">
							{user.email}
						</p>
					</div>
					<DropdownMenu.Separator className="my-1 h-px bg-[var(--line)]" />
					<div className="px-2 py-2">
						<ThemeToggle />
					</div>
					<DropdownMenu.Separator className="my-1 h-px bg-[var(--line)]" />
					<DropdownMenu.Item
						className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-destructive outline-none transition-colors focus:bg-destructive/10"
						onSelect={onLogout}
					>
						<LogOut aria-hidden="true" className="size-4" />
						Log out
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	);
}
