import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	AdminMessage,
	AdminPageError,
	AdminPageHeader,
	AdminPageLoading,
} from "#/features/admin/admin-page";
import {
	adminAiKeysOptions,
	invalidateAdminAiKeys,
} from "#/features/admin/admin-queries";
import { AiKeysPanel } from "#/features/admin/ai-keys-panel";
import type { AdminAiKey } from "#/features/admin/types";
import { useAdminMutation } from "#/features/admin/use-admin-mutation";
import { orpc } from "#/orpc/client";

type AiKeyAction =
	| { type: "create"; label: string; apiKey: string }
	| { type: "replace"; id: string; apiKey: string }
	| { type: "toggle"; id: string; enabled: boolean }
	| { type: "delete"; id: string }
	| { type: "validate"; id: string }
	| { type: "validateAll" };

export const Route = createFileRoute("/_auth/admin/ai-keys")({
	component: AiKeysRoute,
});

function runAction(action: AiKeyAction) {
	switch (action.type) {
		case "create":
			return orpc.admin.aiKeys.create.call({
				label: action.label,
				apiKey: action.apiKey,
			});
		case "replace":
			return orpc.admin.aiKeys.replace.call({
				id: action.id,
				apiKey: action.apiKey,
			});
		case "toggle":
			return orpc.admin.aiKeys.setEnabled.call({
				id: action.id,
				enabled: action.enabled,
			});
		case "delete":
			return orpc.admin.aiKeys.delete.call({ id: action.id });
		case "validate":
			return orpc.admin.aiKeys.validate.call({ id: action.id });
		case "validateAll":
			return orpc.admin.aiKeys.validateAll.call({});
	}
}

function AiKeysRoute() {
	const keys = useQuery(adminAiKeysOptions());
	const action = useAdminMutation({
		mutationFn: runAction,
		invalidate: invalidateAdminAiKeys,
		successMessage: "AI key changes saved.",
	});
	const toggle = (key: AdminAiKey, enabled: boolean) =>
		action.mutate({ type: "toggle", id: key.id, enabled });
	return (
		<div className="page-wrap grid gap-6 py-8 sm:py-10">
			<AdminPageHeader
				title="AI keys"
				description="Manage and validate Gemini credentials securely."
			/>
			{action.message && <AdminMessage message={action.message} />}
			{keys.isPending ? (
				<AdminPageLoading />
			) : keys.isError || !keys.data ? (
				<AdminPageError onRetry={() => void keys.refetch()} />
			) : (
				<AiKeysPanel
					keys={keys.data}
					pending={action.isPending}
					onCreate={(label, apiKey) =>
						action.mutate({ type: "create", label, apiKey })
					}
					onReplace={(id, apiKey) =>
						action.mutate({ type: "replace", id, apiKey })
					}
					onToggle={toggle}
					onDelete={(id) => action.mutate({ type: "delete", id })}
					onValidate={(id) => action.mutate({ type: "validate", id })}
					onValidateAll={() => action.mutate({ type: "validateAll" })}
				/>
			)}
		</div>
	);
}
