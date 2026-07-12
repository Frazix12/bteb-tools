import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { Message } from "./types";

function isStringRecord(value: unknown): value is Record<string, string> {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value) &&
		Object.values(value).every((item) => typeof item === "string")
	);
}

function fieldErrors(error: unknown): Record<string, string> | undefined {
	if (typeof error !== "object" || error === null || !("data" in error))
		return undefined;
	const data = error.data;
	if (typeof data !== "object" || data === null) return undefined;
	if ("fieldErrors" in data && isStringRecord(data.fieldErrors))
		return data.fieldErrors;
	if (!("issues" in data) || !Array.isArray(data.issues)) return undefined;
	const fields: Record<string, string> = {};
	for (const issue of data.issues) {
		if (
			typeof issue !== "object" ||
			issue === null ||
			!("path" in issue) ||
			!Array.isArray(issue.path) ||
			!("message" in issue) ||
			typeof issue.message !== "string"
		)
			continue;
		const field = issue.path[0];
		if (typeof field === "string" && !(field in fields))
			fields[field] = issue.message;
	}
	return Object.keys(fields).length ? fields : undefined;
}

export function useAdminMutation<TAction>({
	mutationFn,
	invalidate,
	successMessage,
}: {
	mutationFn: (action: TAction) => Promise<unknown>;
	invalidate: (
		queryClient: ReturnType<typeof useQueryClient>,
	) => Promise<unknown>;
	successMessage: string;
}) {
	const queryClient = useQueryClient();
	const [message, setMessage] = useState<Message>(null);
	const mutation = useMutation({
		mutationFn,
		onSuccess: async () => {
			await invalidate(queryClient);
			setMessage({ text: successMessage });
		},
		onError: (error) =>
			setMessage({
				error: true,
				text: error instanceof Error ? error.message : "The action failed.",
				fields: fieldErrors(error),
			}),
	});
	return { mutate: mutation.mutate, isPending: mutation.isPending, message };
}
