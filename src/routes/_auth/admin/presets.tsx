import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
	AdminMessage,
	AdminPageError,
	AdminPageHeader,
	AdminPageLoading,
} from "#/features/admin/admin-page";
import {
	adminPresetsOptions,
	invalidateAdminPresets,
	invalidateAdminSummary,
} from "#/features/admin/admin-queries";
import { PresetsPanel } from "#/features/admin/presets-panel";
import type { AdminPreset, PresetInput } from "#/features/admin/types";
import { useAdminMutation } from "#/features/admin/use-admin-mutation";
import { orpc } from "#/orpc/client";

type PresetAction =
	| { type: "create"; value: PresetInput }
	| { type: "update"; id: string; value: PresetInput }
	| { type: "toggle"; id: string; enabled: boolean }
	| { type: "delete"; id: string };

export const Route = createFileRoute("/_auth/admin/presets")({
	component: PresetsRoute,
});

function runAction(action: PresetAction) {
	switch (action.type) {
		case "create":
			return orpc.admin.presets.create.call(action.value);
		case "update":
			return orpc.admin.presets.update.call({ id: action.id, ...action.value });
		case "toggle":
			return orpc.admin.presets.setEnabled.call({
				id: action.id,
				enabled: action.enabled,
			});
		case "delete":
			return orpc.admin.presets.delete.call({ id: action.id });
	}
}

function PresetsRoute() {
	const [page, setPage] = useState(1);
	const presets = useQuery(adminPresetsOptions(page));
	const action = useAdminMutation({
		mutationFn: runAction,
		invalidate: async (client) => {
			await Promise.all([
				invalidateAdminPresets(client),
				invalidateAdminSummary(client),
			]);
		},
		successMessage: "Preset changes saved.",
	});
	return (
		<div className="page-wrap grid gap-6 py-8 sm:py-10">
			<AdminPageHeader
				title="Presets"
				description="Create and maintain reusable document starting points."
			/>
			{action.message && <AdminMessage message={action.message} />}
			{presets.isPending ? (
				<AdminPageLoading />
			) : presets.isError || !presets.data ? (
				<AdminPageError onRetry={() => void presets.refetch()} />
			) : (
				<PresetsPanel
					data={presets.data}
					pending={action.isPending}
					message={action.message}
					onSave={(value, id) =>
						action.mutate(
							id ? { type: "update", id, value } : { type: "create", value },
						)
					}
					onToggle={(preset: AdminPreset, enabled) =>
						action.mutate({ type: "toggle", id: preset.id, enabled })
					}
					onDelete={(id) => action.mutate({ type: "delete", id })}
					onPage={(_, next) => setPage(next)}
				/>
			)}
		</div>
	);
}
