import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { Message } from "./types";

function fieldErrors(error: unknown) {
	if (typeof error !== "object" || error === null || !("data" in error))
		return undefined;
	const data = error.data;
	if (typeof data !== "object" || data === null || !("fieldErrors" in data))
		return undefined;
	return data.fieldErrors as Record<string, string> | undefined;
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
