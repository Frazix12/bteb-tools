import { AdminPageHeader } from "./admin-page";

export function AdminPlaceholder({ title }: { title: string }) {
	return (
		<div className="grid gap-6">
			<AdminPageHeader
				description={`${title} management tools are coming next.`}
				title={title}
			/>
			<output className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
				This page is ready. No management data is loaded yet.
			</output>
		</div>
	);
}
