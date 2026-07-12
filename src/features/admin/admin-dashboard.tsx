import type { ReactNode } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "#/components/ui/alert-dialog";
import { AiKeysPanel } from "./ai-keys-panel";
import { DataPanel } from "./data-panel";
import { PresetsPanel } from "./presets-panel";
import type {
	AdminAiKey,
	AdminDocument,
	AdminPreset,
	AdminUser,
	Message,
	Page,
	PageKind,
	PresetInput,
	Summary,
	Usage,
} from "./types";
import { UsagePanel } from "./usage-panel";
import { UsersPanel } from "./users-panel";
export function Confirm({
	children,
	title,
	description,
	action,
	onConfirm,
}: {
	children: ReactNode;
	title: string;
	description: string;
	action: string;
	onConfirm: () => void;
}) {
	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction onClick={onConfirm}>{action}</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
export type AdminDashboardProps = {
	users: Page<AdminUser>;
	usage: Usage;
	summary: Summary;
	documents: Page<AdminDocument>;
	presets: Page<AdminPreset>;
	aiKeys: AdminAiKey[];
	bootstrapEmail: string;
	pending: boolean;
	message: Message;
	onPage: (kind: PageKind, page: number) => void;
	onUsagePage: (kind: "date" | "user", page: number) => void;
	onRole: (user: AdminUser, role: "user" | "admin") => void;
	onDeleteDocument: (id: string) => void;
	onSavePreset: (input: PresetInput, id?: string) => void;
	onTogglePreset: (preset: AdminPreset, enabled: boolean) => void;
	onDeletePreset: (id: string) => void;
	onCreateAiKey: (label: string, apiKey: string) => void;
	onReplaceAiKey: (id: string, apiKey: string) => void;
	onToggleAiKey: (key: AdminAiKey, enabled: boolean) => void;
	onDeleteAiKey: (id: string) => void;
	onValidateAiKey: (id: string) => void;
	onValidateAllAiKeys: () => void;
};
export function AdminDashboardView(p: AdminDashboardProps) {
	return (
		<main className="page-wrap grid gap-6 py-8 sm:py-10">
			<header className="max-w-3xl">
				<p className="island-kicker">Workspace controls</p>
				<h1 className="font-serif text-4xl font-bold">Administration</h1>
				<p className="mt-2 text-muted-foreground">
					Manage access, monitor AI usage, review stored data, and maintain
					reusable presets.
				</p>
			</header>
			{p.message && (
				<p
					className={`rounded-xl border px-4 py-3 text-sm ${p.message.error ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-[var(--chip-line)] bg-[var(--chip-bg)]"}`}
					role={p.message.error ? "alert" : "status"}
				>
					{p.message.text}
				</p>
			)}
			<UsersPanel
				data={p.users}
				onRole={p.onRole}
				onPage={p.onPage}
				pending={p.pending}
				bootstrapEmail={p.bootstrapEmail}
			/>
			<UsagePanel data={p.usage} onPage={p.onUsagePage} pending={p.pending} />
			<AiKeysPanel
				keys={p.aiKeys}
				pending={p.pending}
				onCreate={p.onCreateAiKey}
				onReplace={p.onReplaceAiKey}
				onToggle={p.onToggleAiKey}
				onDelete={p.onDeleteAiKey}
				onValidate={p.onValidateAiKey}
				onValidateAll={p.onValidateAllAiKeys}
			/>
			<DataPanel
				summary={p.summary}
				data={p.documents}
				onDelete={p.onDeleteDocument}
				onPage={p.onPage}
				pending={p.pending}
			/>
			<PresetsPanel
				data={p.presets}
				onSave={p.onSavePreset}
				onToggle={p.onTogglePreset}
				onDelete={p.onDeletePreset}
				pending={p.pending}
				onPage={p.onPage}
				message={p.message}
			/>
		</main>
	);
}
