import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { AdminDashboardView } from "#/features/admin/admin-dashboard";
import {
	adminDocumentsOptions,
	adminPresetsOptions,
	adminSummaryOptions,
	adminUsageOptions,
	adminUsersOptions,
	invalidateAdmin,
} from "#/features/admin/admin-queries";
import { orpc } from "#/orpc/client";

export const Route = createFileRoute("/_auth/admin")({
	beforeLoad: ({ context }) => {
		if (context.user.role !== "admin") throw redirect({ to: "/dashboard" });
	},
	component: AdminPage,
});

function AdminPage() {
	const q = useQueryClient();
	const [pages, setPages] = useState({ users: 1, documents: 1 });
	const [message, setMessage] = useState<any>(null);
	const users = useQuery(adminUsersOptions(pages.users)),
		usage = useQuery(adminUsageOptions()),
		summary = useQuery(adminSummaryOptions()),
		documents = useQuery(adminDocumentsOptions(pages.documents)),
		presets = useQuery(adminPresetsOptions());
	const mutation = useMutation({
		mutationFn: async ({ kind, input }: any) => {
			if (kind === "role") return orpc.admin.users.setRole.call(input);
			if (kind === "document")
				return orpc.admin.data.deleteDocument.call(input);
			if (kind === "toggle") return orpc.admin.presets.setEnabled.call(input);
			if (kind === "deletePreset") return orpc.admin.presets.delete.call(input);
			return orpc.admin.presets.create.call(input);
		},
		onSuccess: async () => {
			await invalidateAdmin(q);
			setMessage({ text: "Admin changes saved." });
		},
		onError: (e: any) =>
			setMessage({
				error: true,
				text: e?.message || "The admin action failed.",
			}),
	});
	if ([users, usage, summary, documents, presets].some((x) => x.isPending))
		return <output>Loading administration…</output>;
	if (
		!users.data ||
		!usage.data ||
		!summary.data ||
		!documents.data ||
		!presets.data
	)
		return <p role="alert">Administration data could not be loaded.</p>;
	return (
		<AdminDashboardView
			users={users.data}
			usage={usage.data}
			summary={summary.data}
			documents={documents.data}
			presets={presets.data}
			pending={mutation.isPending ? "action" : null}
			message={message}
			onPage={(kind: string, page: number) =>
				setPages((x) => ({ ...x, [kind]: page }))
			}
			onRole={(u: any, role: any) =>
				mutation.mutate({ kind: "role", input: { userId: u.id, role } })
			}
			onDeleteDocument={(id: string) =>
				mutation.mutate({ kind: "document", input: { id } })
			}
			onSavePreset={(input: any) => mutation.mutate({ kind: "create", input })}
			onTogglePreset={(p: any, enabled: boolean) =>
				mutation.mutate({ kind: "toggle", input: { id: p.id, enabled } })
			}
			onDeletePreset={(id: string) =>
				mutation.mutate({ kind: "deletePreset", input: { id } })
			}
		/>
	);
}
