// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { useAdminMutation } from "./use-admin-mutation";

afterEach(cleanup);
function Harness({
	mutationFn,
	invalidate,
}: {
	mutationFn: () => Promise<unknown>;
	invalidate: () => Promise<unknown>;
}) {
	const action = useAdminMutation({
		mutationFn,
		invalidate,
		successMessage: "Saved.",
	});
	return (
		<>
			<button
				disabled={action.isPending}
				type="button"
				onClick={() => action.mutate(undefined)}
			>
				save
			</button>
			<span>{action.message?.text}</span>
			<span data-testid="slug-error">{action.message?.fields?.slug}</span>
		</>
	);
}
function setup(
	mutationFn: () => Promise<unknown>,
	invalidate = vi.fn(async () => undefined),
) {
	const client = new QueryClient({
		defaultOptions: { mutations: { retry: false } },
	});
	render(
		<QueryClientProvider client={client}>
			<Harness mutationFn={mutationFn} invalidate={invalidate} />
		</QueryClientProvider>,
	);
	return invalidate;
}
test("disables duplicate actions while pending and calls only its supplied invalidator", async () => {
	let resolve!: () => void;
	const mutationFn = vi.fn(
		() =>
			new Promise<void>((done) => {
				resolve = done;
			}),
	);
	const invalidate = setup(mutationFn);
	const button = screen.getByRole("button", { name: "save" });
	fireEvent.click(button);
	await waitFor(() =>
		expect((button as HTMLButtonElement).disabled).toBe(true),
	);
	fireEvent.click(button);
	expect(mutationFn).toHaveBeenCalledTimes(1);
	resolve();
	await waitFor(() => expect(screen.getByText("Saved.")).toBeTruthy());
	expect(invalidate).toHaveBeenCalledTimes(1);
});
test("shows mutation errors and does not invalidate", async () => {
	const invalidate = setup(async () => {
		throw new Error("Denied");
	});
	fireEvent.click(screen.getByRole("button", { name: "save" }));
	await waitFor(() => expect(screen.getByText("Denied")).toBeTruthy());
	expect(invalidate).not.toHaveBeenCalled();
});
test("preserves oRPC field errors for labelled form inputs", async () => {
	setup(async () => {
		throw Object.assign(new Error("Invalid preset"), {
			data: { fieldErrors: { slug: "Slug is already in use." } },
		});
	});
	fireEvent.click(screen.getByRole("button", { name: "save" }));
	await waitFor(() =>
		expect(screen.getByTestId("slug-error").textContent).toBe(
			"Slug is already in use.",
		),
	);
});
