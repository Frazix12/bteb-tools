import { describe, expect, test } from "vitest";

import { createSessionReader } from "./session";

describe("createSessionReader", () => {
	test("returns null when Better Auth has no session", async () => {
		const headers = new Headers();
		const calls: Headers[] = [];
		const readSession = createSessionReader({
			getSession: ({ headers: receivedHeaders }) => {
				calls.push(receivedHeaders);
				return Promise.resolve(null);
			},
		});

		await expect(readSession(headers)).resolves.toBeNull();
		expect(calls).toEqual([headers]);
	});

	test("returns the authenticated session", async () => {
		const session = {
			session: { id: "session-1", userId: "user-1" },
			user: { id: "user-1", email: "student@example.com" },
		};
		const readSession = createSessionReader({
			getSession: () => Promise.resolve(session),
		});

		await expect(readSession(new Headers())).resolves.toEqual(session);
	});
});
