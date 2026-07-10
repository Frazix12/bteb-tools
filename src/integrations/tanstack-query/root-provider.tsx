import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import type { PropsWithChildren } from "react";

let browserQueryClient: QueryClient | undefined;

export function createAppQueryClient() {
	return new QueryClient({
		defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
	});
}

export function getContext() {
	if (typeof window === "undefined") {
		return { queryClient: createAppQueryClient() };
	}
	if (!browserQueryClient) browserQueryClient = createAppQueryClient();
	const queryClient = browserQueryClient;
	return { queryClient };
}

export default function TanstackQueryProvider({ children }: PropsWithChildren) {
	const router = useRouter();
	return (
		<QueryClientProvider client={router.options.context.queryClient}>
			{children}
		</QueryClientProvider>
	);
}
