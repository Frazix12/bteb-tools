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
export function AdminDashboardView(p: any) {
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
			/>
			<UsagePanel data={p.usage} />
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
			/>
		</main>
	);
}
