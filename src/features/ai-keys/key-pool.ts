import type { GeminiFailure } from "./gemini-errors";
import type { AiKeyRepository, KeyHealthUpdate, PublicAiKey } from "./types";

export interface GeminiKeyPool {
	run<T>(execute: (apiKey: string) => Promise<T>): Promise<T>;
	validateOne(id: string): Promise<PublicAiKey>;
	validateAll(): Promise<PublicAiKey[]>;
}

export class GeminiKeyUnavailableError extends Error {
	constructor() {
		super("No usable Gemini API key is available");
		this.name = "GeminiKeyUnavailableError";
	}
}

type Dependencies = {
	repo: AiKeyRepository;
	getFallbackKey: () => string | undefined | null;
	now: () => Date;
	classifier: (error: unknown, now: Date) => GeminiFailure;
	validateCredential: (apiKey: string) => Promise<void>;
	getPublicKey?: (id: string) => Promise<PublicAiKey>;
};

function updateFor(failure: GeminiFailure): KeyHealthUpdate {
	return {
		kind: failure.kind,
		validationStatus:
			failure.kind === "invalid"
				? "invalid"
				: failure.kind === "transient"
					? "transient_failure"
					: undefined,
		enabled: failure.kind === "invalid" ? false : undefined,
		cooldownUntil: failure.cooldownUntil,
		failureCode: failure.code,
		failureMessage: failure.message,
	};
}

export function createGeminiKeyPool(deps: Dependencies): GeminiKeyPool {
	const publicKey = async (id: string) => {
		if (deps.getPublicKey) return deps.getPublicKey(id);
		const key = (await deps.repo.list()).find((item) => item.id === id);
		if (!key) throw new GeminiKeyUnavailableError();
		return key;
	};
	const validateOne = async (id: string): Promise<PublicAiKey> => {
		const candidate = await deps.repo.getForValidation(id);
		const checkedAt = deps.now();
		try {
			await deps.validateCredential(candidate.apiKey);
			await deps.repo.recordSuccess(id, checkedAt);
		} catch (error) {
			const failure = deps.classifier(error, checkedAt);
			await deps.repo.recordFailure(id, updateFor(failure), checkedAt);
		}
		return publicKey(id);
	};
	return {
		async run<T>(execute: (apiKey: string) => Promise<T>): Promise<T> {
			const attempted = new Set<string>();
			let lastError: unknown;
			for (const candidate of await deps.repo.selectCandidates(deps.now())) {
				if (attempted.has(candidate.id)) continue;
				attempted.add(candidate.id);
				const attemptAt = deps.now();
				try {
					const result = await execute(candidate.apiKey);
					await deps.repo.recordSuccess(candidate.id, attemptAt);
					return result;
				} catch (error) {
					const failure = deps.classifier(error, attemptAt);
					await deps.repo.recordFailure(
						candidate.id,
						updateFor(failure),
						attemptAt,
					);
					if (failure.kind === "request") throw error;
					lastError = error;
				}
			}
			const fallback = deps.getFallbackKey();
			if (fallback) return execute(fallback);
			if (lastError) throw new GeminiKeyUnavailableError();
			throw new GeminiKeyUnavailableError();
		},
		validateOne,
		async validateAll() {
			const ids = (await deps.repo.list()).map(({ id }) => id);
			const results = new Array<PublicAiKey>(ids.length);
			let next = 0;
			const worker = async () => {
				while (next < ids.length) {
					const index = next++;
					results[index] = await validateOne(ids[index]);
				}
			};
			await Promise.all(
				Array.from({ length: Math.min(3, ids.length) }, worker),
			);
			return results;
		},
	};
}
