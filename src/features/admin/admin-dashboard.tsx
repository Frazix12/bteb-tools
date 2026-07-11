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
import { DataPanel } from "./data-panel";
import { PresetsPanel } from "./presets-panel";
import type {
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
};
export function AdminDashboardView(p: AdminDashboardProps) {
	return (
		<main className="mx-auto grid max-w-7xl gap-8 p-4">
			<header>
				<h1 className="font-serif text-3xl font-bold">Administration</h1>
				<p>Manage access, usage, stored data, and reusable presets.</p>
			</header>
			{p.message && (
				<p role={p.message.error ? "alert" : "status"}>{p.message.text}</p>
			)}
			<UsersPanel
				data={p.users}
				onRole={p.onRole}
				onPage={p.onPage}
				pending={p.pending}
				bootstrapEmail={p.bootstrapEmail}
			/>
			<UsagePanel data={p.usage} onPage={p.onUsagePage} pending={p.pending} />
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
