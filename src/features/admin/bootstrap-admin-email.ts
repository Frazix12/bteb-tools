import { createServerFn } from "@tanstack/react-start";
import { getBootstrapAdminEmail } from "#/config/bootstrap-admin";

export const getAdminBootstrapEmail = createServerFn({ method: "GET" }).handler(
	() => getBootstrapAdminEmail(),
);
