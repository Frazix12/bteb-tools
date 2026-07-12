import { chat } from "@tanstack/ai";
import { createGeminiChat, type GeminiTextModel } from "@tanstack/ai-gemini";

type ValidatorDependencies<TAdapter> = {
	model: string;
	createAdapter: (model: string, apiKey: string) => TAdapter;
	runChat: (adapter: TAdapter) => Promise<unknown>;
};

export function createGeminiCredentialValidator<TAdapter>({
	model,
	createAdapter,
	runChat,
}: ValidatorDependencies<TAdapter>) {
	return async (apiKey: string): Promise<void> => {
		const adapter = createAdapter(model, apiKey);
		await runChat(adapter);
	};
}

export function createProductionGeminiCredentialValidator(model: string) {
	return createGeminiCredentialValidator({
		model,
		createAdapter: (configuredModel, apiKey) =>
			createGeminiChat(configuredModel as GeminiTextModel, apiKey),
		runChat: async (adapter) => {
			await chat({
				adapter,
				messages: [{ role: "user", content: "Reply OK." }],
				stream: false,
			});
		},
	});
}
