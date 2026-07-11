export const BOOTSTRAP_ADMIN_EMAIL_DEFAULT = "frazixgaming22@gmail.com";

type BootstrapAdminEnvironment = {
	BOOTSTRAP_ADMIN_EMAIL?: string;
};

export function getBootstrapAdminEmail(
	runtimeEnv: BootstrapAdminEnvironment = {
		BOOTSTRAP_ADMIN_EMAIL:
			process.env.BOOTSTRAP_ADMIN_EMAIL ??
			import.meta.env.BOOTSTRAP_ADMIN_EMAIL,
	},
): string {
	const configuredEmail =
		runtimeEnv.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
	return configuredEmail || BOOTSTRAP_ADMIN_EMAIL_DEFAULT;
}
