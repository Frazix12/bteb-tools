// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	useQuery: vi.fn(),
	usersOptions: vi.fn((page: number) => ({ page })),
	mutate: vi.fn(),
	useAdminMutation: vi.fn(),
}));
vi.mock("@tanstack/react-query", () => ({ useQuery: mocks.useQuery }));
vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (options: unknown) => options,
}));
vi.mock("#/features/admin/admin-queries", () => ({
	adminUsersOptions: mocks.usersOptions,
	invalidateAdminUsers: vi.fn(),
	invalidateAdminSummary: vi.fn(),
}));
vi.mock("#/features/admin/use-admin-mutation", () => ({
	useAdminMutation: mocks.useAdminMutation,
}));
vi.mock("#/features/admin/users-panel", () => ({
	UsersPanel: (props: {
		bootstrapEmail: string;
		onPage: (kind: "users", page: number) => void;
		onRole: (user: { id: string }, role: "admin") => void;
	}) => (
		<div>
			<span>{props.bootstrapEmail}</span>
			<button type="button" onClick={() => props.onPage("users", 2)}>
				page
			</button>
			<button
				type="button"
				onClick={() => props.onRole({ id: "other-admin" }, "admin")}
			>
				role
			</button>
		</div>
	),
}));
vi.mock("#/features/admin/admin-page", () => ({
	AdminPageHeader: () => null,
	AdminPageLoading: () => null,
	AdminPageError: () => null,
	AdminMessage: () => null,
}));
vi.mock("#/config/bootstrap-admin", () => ({
	getBootstrapAdminEmail: () => "configured@example.com",
}));
vi.mock("#/orpc/client", () => ({
	orpc: { admin: { users: { setRole: { call: vi.fn() } } } },
}));

import { UsersRoute } from "./users";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});
test("fetches only users, owns pagination and role mutation, and protects configured bootstrap identity", () => {
	mocks.useQuery.mockReturnValue({
		data: { items: [], total: 0, page: 1, pageSize: 20 },
		isPending: false,
		isError: false,
	});
	mocks.useAdminMutation.mockReturnValue({
		mutate: mocks.mutate,
		isPending: false,
		message: null,
	});
	render(<UsersRoute />);
	expect(mocks.usersOptions).toHaveBeenCalledWith(1);
	expect(screen.getByText("configured@example.com")).toBeTruthy();
	fireEvent.click(screen.getByRole("button", { name: "page" }));
	expect(mocks.usersOptions).toHaveBeenLastCalledWith(2);
	fireEvent.click(screen.getByRole("button", { name: "role" }));
	expect(mocks.mutate).toHaveBeenCalledWith({
		userId: "other-admin",
		role: "admin",
	});
});
