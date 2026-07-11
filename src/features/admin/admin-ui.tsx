import type { ReactNode } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
} from "#/components/ui/card";

export function AdminPanel({
	title,
	description,
	icon,
	action,
	children,
}: {
	title: string;
	description: string;
	icon: ReactNode;
	action?: ReactNode;
	children: ReactNode;
}) {
	const id = `admin-${title.toLowerCase().replaceAll(" ", "-")}`;
	return (
		<Card
			data-admin-panel
			className="gap-5 border-[var(--line)] bg-[var(--surface-strong)] shadow-lg shadow-[rgba(23,58,64,0.06)]"
		>
			<CardHeader className="border-b border-[var(--line)] pb-5 sm:grid-cols-[1fr_auto]">
				<div>
					<h2
						id={id}
						className="flex items-center gap-2 text-xl font-semibold text-[var(--sea-ink)]"
					>
						{icon}
						{title}
					</h2>
					<CardDescription className="mt-2">{description}</CardDescription>
				</div>
				{action && <div className="mt-3 sm:mt-0">{action}</div>}
			</CardHeader>
			<CardContent aria-labelledby={id} className="space-y-5">
				{children}
			</CardContent>
		</Card>
	);
}

export function AdminStat({
	label,
	value,
}: {
	label: string;
	value: ReactNode;
}) {
	return (
		<div
			data-admin-stat
			className="rounded-xl border border-[var(--line)] bg-white/60 p-4 shadow-sm"
		>
			<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
				{label}
			</p>
			<p className="mt-1 text-2xl font-bold text-[var(--sea-ink)]">{value}</p>
		</div>
	);
}

export const tableClass =
	"w-full min-w-[720px] border-separate border-spacing-0 text-left text-sm [&_th]:border-b [&_th]:border-[var(--line)] [&_th]:bg-[var(--foam)] [&_th]:px-4 [&_th]:py-3 [&_th]:font-semibold [&_td]:border-b [&_td]:border-[var(--line)] [&_td]:px-4 [&_td]:py-3 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-white/60";
