export type AiKeyValidationStatus =
	| "unchecked"
	| "valid"
	| "invalid"
	| "transient_failure";

export type PublicAiKey = {
	id: string;
	provider: "google";
	label: string;
	maskedSuffix: string;
	enabled: boolean;
	validationStatus: AiKeyValidationStatus;
	cooldownUntil: Date | null;
	lastCheckedAt: Date | null;
	lastUsedAt: Date | null;
	lastSuccessAt: Date | null;
	lastFailureAt: Date | null;
	failureCode: string | null;
	failureMessage: string | null;
};

export type ManagedAiKeyCandidate = { id: string; apiKey: string };

export type KeyHealthUpdate = {
	kind?: "invalid" | "quota" | "transient" | "request";
	validationStatus?: AiKeyValidationStatus;
	enabled?: boolean;
	cooldownUntil?: Date | null;
	failureCode?: string | null;
	failureMessage?: string | null;
};

export type AiKeyWrite = { label: string; apiKey: string; actorId: string };

export interface AiKeyRepository {
	list(): Promise<PublicAiKey[]>;
	create(input: AiKeyWrite): Promise<PublicAiKey>;
	replace(id: string, input: AiKeyWrite): Promise<PublicAiKey>;
	setEnabled(
		id: string,
		enabled: boolean,
		actorId: string,
	): Promise<PublicAiKey>;
	delete(id: string): Promise<void>;
	getForValidation(id: string): Promise<ManagedAiKeyCandidate>;
	selectCandidates(now: Date): Promise<ManagedAiKeyCandidate[]>;
	recordSuccess(id: string, now: Date): Promise<void>;
	recordValidationSuccess(id: string, now: Date): Promise<void>;
	recordFailure(id: string, update: KeyHealthUpdate, now: Date): Promise<void>;
}
