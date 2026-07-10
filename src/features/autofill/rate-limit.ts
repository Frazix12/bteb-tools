import { and, count, eq, gt, lte, min, sql } from "drizzle-orm";

export const AUTOFILL_QUOTA_LIMIT = 10;
export const AUTOFILL_QUOTA_WINDOW_MS = 60 * 60 * 1_000;

export interface AutofillQuotaResult {
	allowed: boolean;
	remaining: number;
	retryAt: Date | null;
}

export interface AutofillQuotaRepository {
	consume(
		ownerId: string,
		now: Date,
		limit: number,
		windowMs: number,
	): Promise<AutofillQuotaResult>;
}

export const postgresAutofillQuotaRepository: AutofillQuotaRepository = {
	async consume(ownerId, now, limit, windowMs) {
		const [{ db }, { autofillRateLimits }] = await Promise.all([
			import("#/db"),
			import("#/db/schema"),
		]);

		return db.transaction(async (transaction) => {
			// A stable per-owner transaction lock makes count-and-insert atomic while
			// allowing different users to consume quota concurrently.
			await transaction.execute(
				sql`select pg_advisory_xact_lock(hashtextextended(${ownerId}, 0))`,
			);

			const boundary = new Date(now.getTime() - windowMs);
			await transaction
				.delete(autofillRateLimits)
				.where(
					and(
						eq(autofillRateLimits.ownerId, ownerId),
						lte(autofillRateLimits.attemptedAt, boundary),
					),
				);

			const [usage] = await transaction
				.select({
					attempts: count(),
					oldestAttempt: min(autofillRateLimits.attemptedAt),
				})
				.from(autofillRateLimits)
				.where(
					and(
						eq(autofillRateLimits.ownerId, ownerId),
						gt(autofillRateLimits.attemptedAt, boundary),
					),
				);

			if (usage.attempts >= limit) {
				const oldestAttempt = usage.oldestAttempt;
				if (!oldestAttempt) {
					throw new Error("Quota usage is missing its oldest attempt");
				}

				return {
					allowed: false,
					remaining: 0,
					retryAt: new Date(oldestAttempt.getTime() + windowMs),
				};
			}

			await transaction.insert(autofillRateLimits).values({
				ownerId,
				attemptedAt: now,
			});

			return {
				allowed: true,
				remaining: limit - usage.attempts - 1,
				retryAt: null,
			};
		});
	},
};

export function consumeAutofillQuota(
	ownerId: string,
	now: Date,
	repository: AutofillQuotaRepository = postgresAutofillQuotaRepository,
): Promise<AutofillQuotaResult> {
	return repository.consume(
		ownerId,
		now,
		AUTOFILL_QUOTA_LIMIT,
		AUTOFILL_QUOTA_WINDOW_MS,
	);
}
