import { LibraryBig, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";
import {
	CoverPageDataSchema,
	IndexSheetDataSchema,
} from "#/orpc/schemas/document";
import { Confirm } from "./admin-dashboard";
import type {
	AdminPreset,
	Message,
	Page,
	PageKind,
	PresetInput,
} from "./types";

type Props = {
	data: Page<AdminPreset>;
	onSave: (v: PresetInput, id?: string) => void;
	onToggle: (p: AdminPreset, e: boolean) => void;
	onDelete: (id: string) => void;
	onPage: (k: PageKind, p: number) => void;
	pending: boolean;
	message: Message;
};
function FieldError({
	field,
	message,
}: {
	field: keyof Draft;
	message: Message;
}) {
	const value = message?.fields?.[field];
	return value ? (
		<p id={`preset-${field}-error`} role="alert">
			{value}
		</p>
	) : null;
}
type Draft = {
	slug: string;
	title: string;
	description: string;
	type: "cover_page" | "index_sheet";
	enabled: boolean;
	data: unknown;
};
const empty: Draft = {
	slug: "",
	title: "",
	description: "",
	type: "cover_page",
	enabled: true,
	data: {},
};
export function PresetsPanel({
	data,
	onSave,
	onToggle,
	onDelete,
	onPage,
	pending,
	message,
}: Props) {
	const [form, setForm] = useState<Draft | null>(null),
		[editId, setEditId] = useState<string>(),
		[json, setJson] = useState("{}"),
		[error, setError] = useState("");
	const set = (key: keyof Draft, value: Draft[keyof Draft]) =>
		setForm((f) => (f ? { ...f, [key]: value } : f));
	function edit(p?: AdminPreset) {
		const value: Draft = p
			? {
					slug: p.slug,
					title: p.title,
					description: p.description,
					type: p.type,
					enabled: p.enabled,
					data: p.data,
				}
			: empty;
		setForm({ ...value });
		setEditId(p?.id);
		setJson(JSON.stringify(value.data, null, 2));
		setError("");
	}
	function save() {
		if (!form) return;
		try {
			const parsed: unknown = JSON.parse(json);
			const result =
				form.type === "cover_page"
					? CoverPageDataSchema.safeParse(parsed)
					: IndexSheetDataSchema.safeParse(parsed);
			if (!result.success) {
				setError("Preset data must match the selected document schema.");
				return;
			}
			if (!form.slug.trim() || !form.title.trim()) {
				setError("Slug and title are required.");
				return;
			}
			if (form.type === "cover_page")
				onSave(
					{
						...form,
						type: "cover_page",
						data: CoverPageDataSchema.parse(parsed),
					},
					editId,
				);
			else
				onSave(
					{
						...form,
						type: "index_sheet",
						data: IndexSheetDataSchema.parse(parsed),
					},
					editId,
				);
		} catch {
			setError("Preset data must be valid JSON.");
		}
	}
	return (
		<section aria-labelledby="presets-title">
			<h2 id="presets-title" className="flex gap-2 text-xl font-semibold">
				<LibraryBig aria-hidden="true" />
				Presets
			</h2>
			<Button disabled={pending} onClick={() => edit()}>
				<Plus aria-hidden="true" />
				New preset
			</Button>
			{form && (
				<div className="grid gap-2">
					<Label htmlFor="preset-slug">Slug</Label>
					<Input
						id="preset-slug"
						value={form.slug}
						aria-invalid={Boolean(message?.fields?.slug)}
						aria-describedby={
							message?.fields?.slug ? "preset-slug-error" : undefined
						}
						onChange={(e) => set("slug", e.target.value)}
					/>
					<FieldError field="slug" message={message} />
					<Label htmlFor="preset-title">Title</Label>
					<Input
						id="preset-title"
						value={form.title}
						aria-invalid={Boolean(message?.fields?.title)}
						aria-describedby={
							message?.fields?.title ? "preset-title-error" : undefined
						}
						onChange={(e) => set("title", e.target.value)}
					/>
					<FieldError field="title" message={message} />
					<Label htmlFor="preset-description">Description</Label>
					<Input
						id="preset-description"
						value={form.description}
						aria-invalid={Boolean(message?.fields?.description)}
						aria-describedby={
							message?.fields?.description
								? "preset-description-error"
								: undefined
						}
						onChange={(e) => set("description", e.target.value)}
					/>
					<FieldError field="description" message={message} />
					<Label htmlFor="preset-type">Type</Label>
					<select
						id="preset-type"
						value={form.type}
						aria-invalid={Boolean(message?.fields?.type)}
						aria-describedby={
							message?.fields?.type ? "preset-type-error" : undefined
						}
						onChange={(e) => set("type", e.target.value as PresetInput["type"])}
					>
						<option value="cover_page">Cover page</option>
						<option value="index_sheet">Index sheet</option>
					</select>
					<FieldError field="type" message={message} />
					<label htmlFor="preset-enabled">
						<input
							id="preset-enabled"
							type="checkbox"
							checked={form.enabled}
							aria-invalid={Boolean(message?.fields?.enabled)}
							aria-describedby={
								message?.fields?.enabled ? "preset-enabled-error" : undefined
							}
							onChange={(e) => set("enabled", e.target.checked)}
						/>
						Enabled
					</label>
					<FieldError field="enabled" message={message} />
					<Label htmlFor="preset-json">Preset data (JSON)</Label>
					<Textarea
						id="preset-json"
						value={json}
						aria-invalid={Boolean(message?.fields?.data) || Boolean(error)}
						aria-describedby={
							message?.fields?.data ? "preset-data-error" : undefined
						}
						onChange={(e) => setJson(e.target.value)}
					/>
					<FieldError field="data" message={message} />
					{error && <p role="alert">{error}</p>}
					<Button disabled={pending} onClick={save}>
						{editId ? "Update preset" : "Save preset"}
					</Button>
				</div>
			)}
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<tbody>
						{data.items.map((p) => (
							<tr key={p.id}>
								<td>{p.title}</td>
								<td>{p.enabled ? "Enabled" : "Disabled"}</td>
								<td>
									<Button
										disabled={pending}
										aria-label={`Edit ${p.title}`}
										onClick={() => edit(p)}
									>
										<Pencil aria-hidden="true" />
										Edit
									</Button>
									<Button
										disabled={pending}
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
											disabled={pending}
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
			<Button
				disabled={pending || data.page <= 1}
				onClick={() => onPage("presets", data.page - 1)}
			>
				Previous page
			</Button>
			<Button
				aria-label="Next page"
				disabled={pending || data.page * data.pageSize >= data.total}
				onClick={() => onPage("presets", data.page + 1)}
			>
				Next page
			</Button>
		</section>
	);
}
