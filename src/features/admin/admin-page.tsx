import { RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "#/components/ui/button";
import type { Message } from "./types";

export function AdminPageHeader({
	title,
	description,
	action,
}: {
	title: string;
	description: string;
	action?: ReactNode;
}) {
	return (
		<header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
			<div className="max-w-3xl">
				<p className="island-kicker">Workspace controls</p>
				<h1 className="font-serif text-4xl font-bold">{title}</h1>
				<p className="mt-2 text-muted-foreground">{description}</p>
			</div>
			{action}
		</header>
	);
}

export function AdminPageLoading() {
	const placeholders = ["users", "documents", "presets", "usage", "keys"];
	return (
		<output
			aria-label="Loading admin page"
			className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
		>
			{placeholders.map((placeholder) => (
				<div
					className="h-44 animate-pulse rounded-xl bg-muted"
					key={placeholder}
				/>
			))}
			<span className="sr-only">Loading…</span>
		</output>
	);
}

export function AdminPageError({ onRetry }: { onRetry: () => void }) {
	return (
		<section
			className="rounded-xl border border-destructive/30 bg-destructive/10 p-5"
			role="alert"
		>
			<h2 className="font-semibold">Could not load admin data</h2>
			<p className="mt-1 text-sm text-muted-foreground">
				The dashboard data is unavailable. Try the request again.
			</p>
			<Button
				className="mt-4"
				onClick={onRetry}
				type="button"
				variant="outline"
			>
				<RefreshCw aria-hidden="true" />
				Retry
			</Button>
		</section>
	);
}

export function AdminMessage({ message }: { message: Message }) {
	if (!message) return null;
	return (
		<p
			className={`rounded-xl border px-4 py-3 text-sm ${message.error ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-[var(--chip-line)] bg-[var(--chip-bg)]"}`}
			role={message.error ? "alert" : "status"}
		>
			{message.text}
		</p>
	);
}
