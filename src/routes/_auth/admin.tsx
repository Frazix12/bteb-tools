import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { getBootstrapAdminEmail } from "#/config/bootstrap-admin";
import { AdminDashboardView } from "#/features/admin/admin-dashboard";
import {
	adminAiKeysOptions,
	adminDocumentsOptions,
	adminPresetsOptions,
	adminSummaryOptions,
	adminUsageOptions,
	adminUsersOptions,
	invalidateAdmin,
} from "#/features/admin/admin-queries";
import type {
	AdminAiKey,
	AdminDocument,
	AdminPreset,
	AdminUser,
	Message,
	Page,
	PresetInput,
	Summary,
	Usage,
} from "#/features/admin/types";
import { orpc } from "#/orpc/client";

type Action =
	| { kind: "role"; input: { userId: string; role: "user" | "admin" } }
	| { kind: "document" | "deletePreset"; input: { id: string } }
	| { kind: "toggle"; input: { id: string; enabled: boolean } }
	| { kind: "create"; input: PresetInput }
	| { kind: "update"; input: PresetInput & { id: string } }
	| { kind: "createAiKey"; input: { label: string; apiKey: string } }
	| { kind: "replaceAiKey"; input: { id: string; apiKey: string } }
	| { kind: "toggleAiKey"; input: { id: string; enabled: boolean } }
	| { kind: "deleteAiKey" | "validateAiKey"; input: { id: string } }
	| { kind: "validateAllAiKeys"; input: Record<string, never> };

export const Route = createFileRoute("/_auth/admin")({
	beforeLoad: ({ context }) => {
		if (context.user.role !== "admin") throw redirect({ to: "/dashboard" });
	},
	component: AdminPage,
});

function AdminPage() {
	const q = useQueryClient();
	const [pages, setPages] = useState({ users: 1, documents: 1, presets: 1 });
	const [usagePages, setUsagePages] = useState({ date: 1, user: 1 });
	const [message, setMessage] = useState<Message>(null);
	const users = useQuery(adminUsersOptions(pages.users)),
		usage = useQuery(adminUsageOptions(usagePages.date, usagePages.user)),
		summary = useQuery(adminSummaryOptions()),
		documents = useQuery(adminDocumentsOptions(pages.documents)),
		presets = useQuery(adminPresetsOptions(pages.presets)),
		aiKeys = useQuery(adminAiKeysOptions());
	const mutation = useMutation({
		mutationFn: async (action: Action) => {
			switch (action.kind) {
				case "role":
					return orpc.admin.users.setRole.call(action.input);
				case "document":
					return orpc.admin.data.deleteDocument.call(action.input);
				case "toggle":
					return orpc.admin.presets.setEnabled.call(action.input);
				case "deletePreset":
					return orpc.admin.presets.delete.call(action.input);
				case "update":
					return orpc.admin.presets.update.call(action.input);
				case "create":
					return orpc.admin.presets.create.call(action.input);
				case "createAiKey":
					return orpc.admin.aiKeys.create.call(action.input);
				case "replaceAiKey":
					return orpc.admin.aiKeys.replace.call(action.input);
				case "toggleAiKey":
					return orpc.admin.aiKeys.setEnabled.call(action.input);
				case "deleteAiKey":
					return orpc.admin.aiKeys.delete.call(action.input);
				case "validateAiKey":
					return orpc.admin.aiKeys.validate.call(action.input);
				case "validateAllAiKeys":
					return orpc.admin.aiKeys.validateAll.call(action.input);
			}
		},
		onSuccess: async () => {
			await invalidateAdmin(q);
			setMessage({ text: "Admin changes saved." });
		},
		onError: (e: unknown) =>
			setMessage({
				error: true,
				text: e instanceof Error ? e.message : "The admin action failed.",
				fields:
					typeof e === "object" && e !== null && "data" in e
						? (e as { data?: { fieldErrors?: Record<string, string> } }).data
								?.fieldErrors
						: undefined,
			}),
	});
	if (
		[users, usage, summary, documents, presets, aiKeys].some((x) => x.isPending)
	)
		return <output>Loading administration…</output>;
	if (
		!users.data ||
		!usage.data ||
		!summary.data ||
		!documents.data ||
		!presets.data ||
		!aiKeys.data
	)
		return <p role="alert">Administration data could not be loaded.</p>;
	return (
		<AdminDashboardView
			users={users.data as Page<AdminUser>}
			usage={usage.data as Usage}
			summary={summary.data as Summary}
			documents={documents.data as Page<AdminDocument>}
			presets={presets.data as Page<AdminPreset>}
			aiKeys={aiKeys.data as AdminAiKey[]}
			pending={mutation.isPending}
			bootstrapEmail={getBootstrapAdminEmail()}
			message={message}
			onPage={(kind: string, page: number) =>
				setPages((x) => ({ ...x, [kind]: page }))
			}
			onUsagePage={(kind, page) =>
				setUsagePages((x) => ({ ...x, [kind]: page }))
			}
			onRole={(u, role) =>
				mutation.mutate({ kind: "role", input: { userId: u.id, role } })
			}
			onDeleteDocument={(id: string) =>
				mutation.mutate({ kind: "document", input: { id } })
			}
			onSavePreset={(input, id) =>
				mutation.mutate(
					id
						? { kind: "update", input: { ...input, id } }
						: { kind: "create", input },
				)
			}
			onTogglePreset={(p, enabled) =>
				mutation.mutate({ kind: "toggle", input: { id: p.id, enabled } })
			}
			onDeletePreset={(id: string) =>
				mutation.mutate({ kind: "deletePreset", input: { id } })
			}
			onCreateAiKey={(label, apiKey) =>
				mutation.mutate({ kind: "createAiKey", input: { label, apiKey } })
			}
			onReplaceAiKey={(id, apiKey) =>
				mutation.mutate({ kind: "replaceAiKey", input: { id, apiKey } })
			}
			onToggleAiKey={(key, enabled) =>
				mutation.mutate({ kind: "toggleAiKey", input: { id: key.id, enabled } })
			}
			onDeleteAiKey={(id) =>
				mutation.mutate({ kind: "deleteAiKey", input: { id } })
			}
			onValidateAiKey={(id) =>
				mutation.mutate({ kind: "validateAiKey", input: { id } })
			}
			onValidateAllAiKeys={() =>
				mutation.mutate({ kind: "validateAllAiKeys", input: {} })
			}
		/>
	);
}
