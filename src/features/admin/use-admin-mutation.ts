import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { Message } from "./types";

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
			}),
	});
	return { mutate: mutation.mutate, isPending: mutation.isPending, message };
}
