import { Button } from "#/components/ui/button";
import type { ThemeMode } from "./theme";
import { useTheme } from "./theme-provider";

const options: ReadonlyArray<{ label: string; mode: ThemeMode }> = [
	{ label: "Light", mode: "light" },
	{ label: "Dark", mode: "dark" },
	{ label: "System", mode: "system" },
];

export function ThemeToggle() {
	const { mode, setMode } = useTheme();

	return (
		<fieldset className="flex items-center gap-1">
			<legend className="sr-only">Theme</legend>
			{options.map((option) => (
				<Button
					key={option.mode}
					type="button"
					variant={mode === option.mode ? "secondary" : "ghost"}
					size="sm"
					aria-pressed={mode === option.mode}
					onClick={() => setMode(option.mode)}
				>
					{option.label}
				</Button>
			))}
		</fieldset>
	);
}
