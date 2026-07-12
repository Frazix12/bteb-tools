import { KeyRound } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { AdminPanel, tableClass } from "./admin-ui";
import { Confirm } from "./confirm";
import type { AdminAiKey } from "./types";

type Props = {
	keys: AdminAiKey[];
	pending: boolean;
	onCreate: (label: string, apiKey: string) => void;
	onReplace: (id: string, apiKey: string) => void;
	onToggle: (key: AdminAiKey, enabled: boolean) => void;
	onDelete: (id: string) => void;
	onValidate: (id: string) => void;
	onValidateAll: () => void;
};
const date = (value: Date | null) =>
	value
		? new Intl.DateTimeFormat("en-US", {
				dateStyle: "medium",
				timeZone: "UTC",
			}).format(value)
		: "Never";
const status = (key: AdminAiKey) =>
	key.cooldownUntil && key.cooldownUntil > new Date()
		? "Cooling down"
		: (
				{
					valid: "Valid",
					invalid: "Invalid",
					transient_failure: "Transient failure",
					unchecked: "Unchecked",
				} as const
			)[key.validationStatus];

export function AiKeysPanel({
	keys,
	pending,
	onCreate,
	onReplace,
	onToggle,
	onDelete,
	onValidate,
	onValidateAll,
}: Props) {
	const [label, setLabel] = useState("");
	const [apiKey, setApiKey] = useState("");
	const [replacements, setReplacements] = useState<Record<string, string>>({});
	return (
		<AdminPanel
			title="Gemini API Keys"
			description="Manage Gemini credentials without exposing stored secrets."
			icon={<KeyRound aria-hidden="true" className="size-5" />}
			action={
				<Button disabled={pending || keys.length === 0} onClick={onValidateAll}>
					Check all keys
				</Button>
			}
		>
			<p className="text-sm text-muted-foreground">
				Validation may consume a small amount of Gemini quota.
			</p>
			<form
				className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]"
				onSubmit={(e) => {
					e.preventDefault();
					onCreate(label, apiKey);
					setApiKey("");
				}}
			>
				<label htmlFor="ai-key-label">
					Key label
					<Input
						id="ai-key-label"
						aria-label="Key label"
						value={label}
						onChange={(e) => setLabel(e.target.value)}
					/>
				</label>
				<label htmlFor="ai-key-secret">
					API key
					<Input
						id="ai-key-secret"
						aria-label="New API key"
						type="password"
						autoComplete="off"
						value={apiKey}
						onChange={(e) => setApiKey(e.target.value)}
					/>
				</label>
				<Button
					disabled={pending || !label.trim() || !apiKey.trim()}
					type="submit"
				>
					Add key
				</Button>
			</form>
			<div className="overflow-x-auto rounded-xl border border-[var(--line)]">
				<table data-admin-table className={tableClass}>
					<thead>
						<tr>
							<th>Label</th>
							<th>Key</th>
							<th>Status</th>
							<th>Last checked</th>
							<th>Last used</th>
							<th>Cooldown</th>
							<th>Replace</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{keys.map((key) => (
							<tr
								key={key.id}
								className={
									key.validationStatus === "invalid"
										? "bg-destructive/10"
										: undefined
								}
							>
								<td>{key.label}</td>
								<td>{`••••${key.maskedSuffix}`}</td>
								<td>{status(key)}</td>
								<td>{date(key.lastCheckedAt)}</td>
								<td>{date(key.lastUsedAt)}</td>
								<td>{key.cooldownUntil ? date(key.cooldownUntil) : "None"}</td>
								<td>
									<Input
										aria-label={`Replacement key for ${key.label}`}
										type="password"
										autoComplete="off"
										value={replacements[key.id] ?? ""}
										onChange={(e) =>
											setReplacements((x) => ({
												...x,
												[key.id]: e.target.value,
											}))
										}
									/>
									<Button
										disabled={pending || !replacements[key.id]?.trim()}
										onClick={() => {
											onReplace(key.id, replacements[key.id]);
											setReplacements((x) => ({ ...x, [key.id]: "" }));
										}}
									>
										Replace {key.label}
									</Button>
								</td>
								<td data-admin-actions className="space-x-2">
									<Button
										disabled={
											pending ||
											(key.validationStatus === "invalid" && !key.enabled)
										}
										onClick={() => onToggle(key, !key.enabled)}
									>
										{key.enabled ? "Disable" : "Enable"} {key.label}
									</Button>
									<Button disabled={pending} onClick={() => onValidate(key.id)}>
										Validate {key.label}
									</Button>
									<Confirm
										title={`Delete ${key.label}?`}
										description="This permanently removes the credential."
										action="Delete permanently"
										onConfirm={() => onDelete(key.id)}
									>
										<Button variant="destructive" disabled={pending}>
											Delete {key.label}
										</Button>
									</Confirm>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</AdminPanel>
	);
}
