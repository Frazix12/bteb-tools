// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { AdminPlaceholder } from "./admin-placeholder";

afterEach(cleanup);

describe("admin placeholder", () => {
	test("identifies the destination and explains the interim state", () => {
		render(<AdminPlaceholder title="Users" />);
		expect(screen.getByRole("heading", { name: "Users" })).toBeTruthy();
		expect(screen.getByText(/coming next/i)).toBeTruthy();
	});
});
