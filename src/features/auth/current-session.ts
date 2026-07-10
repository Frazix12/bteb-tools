import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { getSession } from "#/lib/session";

export const getCurrentSession = createServerFn({ method: "GET" }).handler(() =>
	getSession(getRequestHeaders()),
);
