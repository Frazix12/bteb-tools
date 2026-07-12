import { Link } from "@tanstack/react-router";
import {
	ArrowRight,
	Bot,
	FileText,
	KeyRound,
	LibraryBig,
	Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { AdminPageHeader } from "./admin-page";
import type { AdminAiKey, Summary, Usage } from "./types";

function plural(count: number, singular: string) {
	return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function keyHealth(keys: AdminAiKey[]) {
	if (keys.length === 0) return "No AI keys configured";
	const enabled = keys.filter((key) => key.enabled);
	const invalid = enabled.filter(
		(key) => key.validationStatus === "invalid",
	).length;
	if (invalid) return `${plural(invalid, "key")} failed validation`;
	const uncertain = enabled.filter(
		(key) => key.validationStatus !== "valid",
	).length;
	if (uncertain)
		return `${plural(uncertain, "enabled key")} ${uncertain === 1 ? "needs" : "need"} validation`;
	if (enabled.length === 0) return "No AI keys enabled";
	return "All enabled keys are valid";
}

function MetricCard({
	metric,
	icon,
	label,
	value,
	detail,
	to,
	action,
}: {
	metric: string;
	icon: ReactNode;
	label: string;
	value: number;
	detail: string;
	to:
		| "/admin/users"
		| "/admin/documents"
		| "/admin/presets"
		| "/admin/usage"
		| "/admin/ai-keys";
	action: string;
}) {
	return (
		<Card data-metric={metric}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					{icon}
					{label}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<p className="text-3xl font-bold">{value}</p>
				<p className="mt-2 text-sm text-muted-foreground">{detail}</p>
				<Link
					className="mt-4 inline-flex items-center gap-2 text-sm font-semibold"
					to={to as "/admin"}
				>
					{action}
					<ArrowRight aria-hidden="true" className="size-4" />
				</Link>
			</CardContent>
		</Card>
	);
}

export function AdminOverview({
	summary,
	usage,
	aiKeys,
}: {
	summary: Summary;
	usage: Usage;
	aiKeys: AdminAiKey[];
}) {
	const requests = Number(usage.totals.events ?? summary.aiRequests);
	return (
		<div className="grid gap-6">
			<AdminPageHeader
				title="Overview"
				description="Monitor workspace activity and open the tools that need attention."
			/>
			<section
				aria-label="Administration summary"
				className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
			>
				<MetricCard
					metric="users"
					icon={<Users aria-hidden="true" />}
					label="Users"
					value={summary.users}
					detail="Registered workspace accounts"
					to="/admin/users"
					action="Manage users"
				/>
				<MetricCard
					metric="documents"
					icon={<FileText aria-hidden="true" />}
					label="Documents"
					value={summary.documents}
					detail="Stored user documents"
					to="/admin/documents"
					action="Manage documents"
				/>
				<MetricCard
					metric="presets"
					icon={<LibraryBig aria-hidden="true" />}
					label="Presets"
					value={summary.presets}
					detail={`${plural(summary.enabledPresets, "enabled preset")} available`}
					to="/admin/presets"
					action="Manage presets"
				/>
				<MetricCard
					metric="requests"
					icon={<Bot aria-hidden="true" />}
					label="AI requests"
					value={requests}
					detail="Recorded AI usage events"
					to="/admin/usage"
					action="Review usage"
				/>
				<MetricCard
					metric="keys"
					icon={<KeyRound aria-hidden="true" />}
					label="AI keys"
					value={aiKeys.length}
					detail={`${plural(aiKeys.length, "AI key")} · ${keyHealth(aiKeys)}`}
					to="/admin/ai-keys"
					action="Manage AI keys"
				/>
			</section>
		</div>
	);
}
