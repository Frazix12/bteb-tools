export type GeminiFailureKind = "invalid" | "quota" | "transient" | "request";

export type GeminiFailure = {
	kind: GeminiFailureKind;
	code: string | null;
	message: string;
	retryable: boolean;
	cooldownUntil: Date | null;
};

type ErrorShape = {
	status?: unknown;
	statusCode?: unknown;
	code?: unknown;
	retryAfter?: unknown;
	retryAfterMs?: unknown;
	message?: unknown;
	error?: unknown;
};

function shape(error: unknown): ErrorShape {
	return typeof error === "object" && error !== null
		? (error as ErrorShape)
		: {};
}

function stableCode(error: ErrorShape): string | null {
	const code = error.code;
	return typeof code === "string" && /^[A-Z][A-Z0-9_]{1,63}$/.test(code)
		? code
		: null;
}

function retryDate(error: ErrorShape, now: Date, fallbackMs: number): Date {
	if (
		typeof error.retryAfterMs === "number" &&
		Number.isFinite(error.retryAfterMs)
	)
		return new Date(now.getTime() + Math.max(0, error.retryAfterMs));
	if (
		typeof error.retryAfter === "number" ||
		(typeof error.retryAfter === "string" &&
			/^\d+(\.\d+)?$/.test(error.retryAfter))
	)
		return new Date(now.getTime() + Number(error.retryAfter) * 1_000);
	if (typeof error.retryAfter === "string") {
		const parsed = Date.parse(error.retryAfter);
		if (Number.isFinite(parsed))
			return new Date(Math.max(now.getTime(), parsed));
	}
	return new Date(now.getTime() + fallbackMs);
}

export function classifyGeminiError(error: unknown, now: Date): GeminiFailure {
	const value = shape(error);
	const nested = shape(value.error);
	const statusValue =
		value.status ?? value.statusCode ?? nested.status ?? nested.statusCode;
	const status =
		typeof statusValue === "number" ? statusValue : Number(statusValue);
	const code = stableCode(value) ?? stableCode(nested);
	const message =
		typeof value.message === "string" ? value.message.toLowerCase() : "";
	if (
		status === 401 ||
		status === 403 ||
		code === "API_KEY_INVALID" ||
		code === "UNAUTHENTICATED" ||
		code === "PERMISSION_DENIED"
	) {
		return {
			kind: "invalid",
			code,
			message: "Invalid Gemini credential",
			retryable: true,
			cooldownUntil: null,
		};
	}
	if (
		status === 429 ||
		code === "RESOURCE_EXHAUSTED" ||
		code === "QUOTA_EXCEEDED"
	) {
		return {
			kind: "quota",
			code,
			message: "Gemini quota temporarily exhausted",
			retryable: true,
			cooldownUntil: retryDate({ ...nested, ...value }, now, 60_000),
		};
	}
	if (
		(status >= 400 && status < 500) ||
		[
			"INVALID_ARGUMENT",
			"FAILED_PRECONDITION",
			"SAFETY",
			"SCHEMA_ERROR",
		].includes(code ?? "") ||
		/safety|schema|structured.?output/.test(message)
	) {
		return {
			kind: "request",
			code,
			message: "Gemini rejected the request",
			retryable: false,
			cooldownUntil: null,
		};
	}
	return {
		kind: "transient",
		code,
		message: "Gemini service temporarily unavailable",
		retryable: true,
		cooldownUntil: new Date(now.getTime() + 15_000),
	};
}
