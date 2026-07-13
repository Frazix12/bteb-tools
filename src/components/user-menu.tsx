import { Check, LogOut, UserRound } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import type { ThemeMode } from "#/features/theme/theme";
import { useTheme } from "#/features/theme/theme-provider";

const themeOptions: ReadonlyArray<{ label: string; mode: ThemeMode }> = [
	{ label: "Light", mode: "light" },
	{ label: "Dark", mode: "dark" },
	{ label: "System", mode: "system" },
];

export function UserMenu({
	user,
	onLogout,
}: {
	user: { name: string; email: string; image?: string | null };
	onLogout: () => void;
}) {
	const { mode, setMode } = useTheme();
	const [failedImage, setFailedImage] = useState<string | null>(null);
	const showImage = Boolean(user.image && failedImage !== user.image);

	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger asChild>
				<Button
					aria-label="Open user menu"
					className="size-10 rounded-full border-[var(--chip-line)] bg-[var(--chip-bg)] p-0"
					variant="outline"
				>
					{showImage ? (
						<img
							alt=""
							className="size-9 rounded-full object-cover"
							onError={() => setFailedImage(user.image ?? null)}
							src={user.image ?? undefined}
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
					<DropdownMenu.Label className="px-3 pb-1 pt-2 text-xs font-semibold text-muted-foreground">
						Theme
					</DropdownMenu.Label>
					<DropdownMenu.RadioGroup
						aria-label="Theme"
						value={mode}
						onValueChange={(value) => setMode(value as ThemeMode)}
					>
						{themeOptions.map((option) => (
							<DropdownMenu.RadioItem
								key={option.mode}
								className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:bg-accent"
								value={option.mode}
							>
								<span className="flex size-4 items-center justify-center">
									<DropdownMenu.ItemIndicator>
										<Check aria-hidden="true" className="size-4" />
									</DropdownMenu.ItemIndicator>
								</span>
								{option.label}
							</DropdownMenu.RadioItem>
						))}
					</DropdownMenu.RadioGroup>
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
