import { sql } from "drizzle-orm";
import {
	bigint,
	bigserial,
	boolean,
	check,
	index,
	jsonb,
	pgEnum,
	pgTable,
	serial,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

export const todos = pgTable("todos", {
	id: serial("id").primaryKey(),
	title: text("title").notNull(),
	createdAt: timestamp("created_at").defaultNow(),
});

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	image: text("image"),
	role: userRoleEnum("role").default("user").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

export const session = pgTable(
	"session",
	{
		id: text("id").primaryKey(),
		expiresAt: timestamp("expires_at").notNull(),
		token: text("token").notNull().unique(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.$onUpdate(() => new Date())
			.notNull(),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
	"account",
	{
		id: text("id").primaryKey(),
		accountId: text("account_id").notNull(),
		providerId: text("provider_id").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		idToken: text("id_token"),
		accessTokenExpiresAt: timestamp("access_token_expires_at"),
		refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
		scope: text("scope"),
		password: text("password"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = pgTable(
	"verification",
	{
		id: text("id").primaryKey(),
		identifier: text("identifier").notNull(),
		value: text("value").notNull(),
		expiresAt: timestamp("expires_at").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const documentTypeEnum = pgEnum("document_type", [
	"index_sheet",
	"cover_page",
]);

export const preset = pgTable(
	"preset",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		slug: text("slug").notNull().unique(),
		title: text("title").notNull(),
		description: text("description").notNull(),
		type: documentTypeEnum("type").notNull(),
		data: jsonb("data").notNull(),
		enabled: boolean("enabled").default(true).notNull(),
		createdBy: text("created_by").references(() => user.id, {
			onDelete: "set null",
		}),
		updatedBy: text("updated_by").references(() => user.id, {
			onDelete: "set null",
		}),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("preset_enabled_type_idx").on(table.enabled, table.type)],
);

export const aiUsageEvent = pgTable(
	"ai_usage_event",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		ownerId: text("owner_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		provider: text("provider").notNull(),
		model: text("model").notNull(),
		inputTokens: bigint("input_tokens", { mode: "bigint" }),
		outputTokens: bigint("output_tokens", { mode: "bigint" }),
		costMicros: bigint("cost_micros", { mode: "bigint" }).notNull(),
		pricingVersion: text("pricing_version").notNull(),
		outcome: text("outcome").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("ai_usage_event_owner_created_at_idx").on(
			table.ownerId,
			table.createdAt.desc(),
		),
		index("ai_usage_event_model_created_at_idx").on(
			table.model,
			table.createdAt.desc(),
		),
	],
);

export const aiKeyValidationStatusEnum = pgEnum("ai_key_validation_status", [
	"unchecked",
	"valid",
	"invalid",
	"transient_failure",
]);

export const aiProviderKey = pgTable(
	"ai_provider_key",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		provider: text("provider").notNull(),
		label: text("label").notNull(),
		encryptedSecret: text("encrypted_secret").notNull(),
		fingerprint: text("fingerprint").notNull().unique(),
		maskedSuffix: text("masked_suffix").notNull(),
		enabled: boolean("enabled").default(false).notNull(),
		validationStatus: aiKeyValidationStatusEnum("validation_status")
			.default("unchecked")
			.notNull(),
		cooldownUntil: timestamp("cooldown_until", { withTimezone: true }),
		lastValidatedAt: timestamp("last_validated_at", { withTimezone: true }),
		lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
		lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
		lastFailureAt: timestamp("last_failure_at", { withTimezone: true }),
		lastFailureCode: text("last_failure_code"),
		lastFailureMessage: text("last_failure_message"),
		createdBy: text("created_by").references(() => user.id, {
			onDelete: "set null",
		}),
		updatedBy: text("updated_by").references(() => user.id, {
			onDelete: "set null",
		}),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("ai_provider_key_provider_eligibility_idx").on(
			table.provider,
			table.enabled,
			table.validationStatus,
			table.cooldownUntil,
		),
		index("ai_provider_key_provider_last_used_idx").on(
			table.provider,
			table.lastUsedAt,
		),
	],
);

export const aiKeyRotationState = pgTable(
	"ai_key_rotation_state",
	{
		provider: text("provider").primaryKey(),
		cursor: bigint("cursor", { mode: "bigint" }).default(sql`0`).notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		check(
			"ai_key_rotation_state_cursor_non_negative",
			sql`${table.cursor} >= 0`,
		),
	],
);

export const documents = pgTable(
	"document",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		ownerId: text("owner_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		type: documentTypeEnum("type").notNull(),
		title: text("title").notNull(),
		data: jsonb("data").notNull(),
		logoDataUrl: text("logo_data_url"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		index("document_owner_updated_at_idx").on(
			table.ownerId,
			table.updatedAt.desc(),
		),
	],
);

export const autofillRateLimits = pgTable(
	"autofill_rate_limit",
	{
		id: bigserial("id", { mode: "bigint" }).primaryKey(),
		ownerId: text("owner_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		attemptedAt: timestamp("attempted_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("autofill_rate_limit_owner_attempted_at_idx").on(
			table.ownerId,
			table.attemptedAt,
		),
	],
);
