type SessionApi<TSession> = {
	getSession: (input: { headers: Headers }) => Promise<TSession | null>;
};

export function createSessionReader<TSession>(api: SessionApi<TSession>) {
	return (headers: Headers) => api.getSession({ headers });
}

export async function getSession(headers: Headers) {
	const { auth } = await import("./auth");
	return createSessionReader(auth.api)(headers);
}
