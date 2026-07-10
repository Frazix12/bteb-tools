import { describe, expect, test } from "vitest";

import {
	AUTOFILL_QUOTA_LIMIT,
	AUTOFILL_QUOTA_WINDOW_MS,
	type AutofillQuotaRepository,
	consumeAutofillQuota,
} from "./rate-limit";

class AtomicMemoryQuotaRepository implements AutofillQuotaRepository {
	private readonly attempts = new Map<string, Date[]>();
	private readonly queues = new Map<string, Promise<void>>();

	async consume(ownerId: string, now: Date, limit: number, windowMs: number) {
		const previous = this.queues.get(ownerId) ?? Promise.resolve();
		let release = () => {};
		const current = new Promise<void>((resolve) => {
			release = resolve;
		});
		this.queues.set(
			ownerId,
			previous.then(() => current),
		);

		await previous;
		try {
			const boundary = now.getTime() - windowMs;
			const recent = (this.attempts.get(ownerId) ?? []).filter(
				(attempt) => attempt.getTime() > boundary,
			);
			const allowed = recent.length < limit;
			if (allowed) recent.push(now);
			this.attempts.set(ownerId, recent);

			return {
				allowed,
				remaining: Math.max(0, limit - recent.length),
				retryAt: allowed ? null : new Date(recent[0].getTime() + windowMs),
			};
		} finally {
			release();
		}
	}
}

describe("consumeAutofillQuota", () => {
	test("allows only ten concurrent provider attempts for one user", async () => {
		const repository = new AtomicMemoryQuotaRepository();
		const now = new Date("2026-07-10T08:00:00.000Z");

		const results = await Promise.all(
			Array.from({ length: 20 }, () =>
				consumeAutofillQuota("user-1", now, repository),
			),
		);

		expect(results.filter((result) => result.allowed)).toHaveLength(10);
		expect(results.filter((result) => !result.allowed)).toHaveLength(10);
		expect(results.at(-1)).toEqual({
			allowed: false,
			remaining: 0,
			retryAt: new Date("2026-07-10T09:00:00.000Z"),
		});
	});

	test("isolates quotas by authenticated user", async () => {
		const repository = new AtomicMemoryQuotaRepository();
		const now = new Date("2026-07-10T08:00:00.000Z");

		await Promise.all(
			Array.from({ length: AUTOFILL_QUOTA_LIMIT }, () =>
				consumeAutofillQuota("user-1", now, repository),
			),
		);

		expect(await consumeAutofillQuota("user-2", now, repository)).toEqual({
			allowed: true,
			remaining: AUTOFILL_QUOTA_LIMIT - 1,
			retryAt: null,
		});
	});

	test("resets each attempt exactly at its rolling-hour boundary", async () => {
		const repository = new AtomicMemoryQuotaRepository();
		const start = new Date("2026-07-10T08:00:00.000Z");

		for (let attempt = 0; attempt < AUTOFILL_QUOTA_LIMIT; attempt += 1) {
			await consumeAutofillQuota("user-1", start, repository);
		}

		const beforeBoundary = new Date(
			start.getTime() + AUTOFILL_QUOTA_WINDOW_MS - 1,
		);
		expect(
			await consumeAutofillQuota("user-1", beforeBoundary, repository),
		).toEqual({
			allowed: false,
			remaining: 0,
			retryAt: new Date(start.getTime() + AUTOFILL_QUOTA_WINDOW_MS),
		});

		const boundary = new Date(start.getTime() + AUTOFILL_QUOTA_WINDOW_MS);
		expect(await consumeAutofillQuota("user-1", boundary, repository)).toEqual({
			allowed: true,
			remaining: AUTOFILL_QUOTA_LIMIT - 1,
			retryAt: null,
		});
	});
});
