import { LibraryBig, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";
import { Confirm } from "./admin-dashboard";
export function PresetsPanel({
	data,
	onSave,
	onToggle,
	onDelete,
	pending,
}: any) {
	const [open, setOpen] = useState(false),
		[json, setJson] = useState("{}"),
		[error, setError] = useState("");
	function save() {
		try {
			const parsed = JSON.parse(json);
			if (!parsed.schemaVersion) throw new Error();
			onSave({
				slug: "new-preset",
				title: "New preset",
				description: "",
				type: "cover_page",
				enabled: true,
				data: parsed,
			});
		} catch {
			setError(
				"Preset data must be valid JSON matching the selected document schema.",
			);
		}
	}
	return (
		<section aria-labelledby="presets-title">
			<h2 id="presets-title" className="flex gap-2 text-xl font-semibold">
				<LibraryBig aria-hidden="true" />
				Presets
			</h2>
			<Button onClick={() => setOpen(!open)}>
				<Plus aria-hidden="true" />
				New preset
			</Button>
			{open && (
				<div className="grid gap-2">
					<Label htmlFor="preset-title">Title</Label>
					<Input id="preset-title" />
					<Label htmlFor="preset-json">Preset data (JSON)</Label>
					<Textarea
						id="preset-json"
						value={json}
						onChange={(e) => setJson(e.target.value)}
					/>
					{error && <p role="alert">{error}</p>}
					<Button onClick={save}>Save preset</Button>
				</div>
			)}
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<tbody>
						{data.items.map((p: any) => (
							<tr key={p.id}>
								<td>{p.title}</td>
								<td>{p.enabled ? "Enabled" : "Disabled"}</td>
								<td>
									<Button
										disabled={pending === `preset:${p.id}`}
										onClick={() => onToggle(p, !p.enabled)}
									>
										{p.enabled ? "Disable" : "Enable"} {p.title}
									</Button>
									<Confirm
										title={`Delete ${p.title}?`}
										description="This permanently deletes the preset."
										action="Delete permanently"
										onConfirm={() => onDelete(p.id)}
									>
										<Button
											variant="destructive"
											aria-label={`Delete ${p.title}`}
										>
											<Trash2 aria-hidden="true" />
										</Button>
									</Confirm>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</section>
	);
}
