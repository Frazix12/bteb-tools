// @vitest-environment jsdom
// biome-ignore-all lint/suspicious/noExplicitAny: deliberately minimal component mocks
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

const queryState = vi.hoisted(() => ({ current: {} as any }));

vi.mock("@tanstack/react-query", () => ({
	useQuery: () => queryState.current,
}));

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children, to, search }: any) => (
		<a href={`${to}?preset=${search?.preset ?? ""}`}>{children}</a>
	),
	createFileRoute: () => (options: any) => ({
		...options,
		useSearch: vi.fn(),
		useRouteContext: vi.fn(() => ({ user: null })),
	}),
	useLocation: vi.fn(() => ({ href: "/current" })),
}));

vi.mock("#/features/cover-page/cover-page-editor", () => ({
	CoverPageEditor: ({ initialData }: any) => {
		return (
			<input
				aria-label="Institute name"
				defaultValue={initialData.instituteName}
			/>
		);
	},
}));
vi.mock("#/features/index-sheet/index-sheet-editor", () => ({
	IndexSheetEditor: ({ initialData }: any) => <p>{initialData.subjectName}</p>,
}));
vi.mock("#/features/editor/use-document-editor", () => ({
	useCoverPageDocument: () => ({ isSaving: false, save: vi.fn() }),
	useIndexSheetDocument: () => ({ isSaving: false, save: vi.fn() }),
}));
vi.mock("#/features/editor/use-unsaved-warning", () => ({
	useUnsavedWarning: vi.fn(),
}));
vi.mock("#/features/presets/queries", () => ({
	presetListQueryOptions: () => ({ queryKey: ["presets"], queryFn: vi.fn() }),
	presetQueryOptions: () => ({ queryKey: ["preset"], queryFn: vi.fn() }),
}));

import {
	PresetDocumentState as CoverPresetState,
	Route as CoverRoute,
	NewCoverPage,
} from "#/routes/_auth/cover-page/new";
import {
	PresetDocumentState as IndexPresetState,
	Route as IndexRoute,
	NewIndexSheet,
} from "#/routes/_auth/index-sheet/new";
import { PresetCards, PresetsPage } from "#/routes/_auth/presets";

afterEach(cleanup);

describe("database-backed preset pages", () => {
	test("uses guest-safe instructions and sign-in navigation", () => {
		queryState.current = { isPending: false, data: [] };
		render(<PresetsPage />);
		expect(screen.getByText(/then print or save as PDF/i)).toBeTruthy();
		expect(
			screen.getByRole("link", { name: /sign in/i }).getAttribute("href"),
		).toBe("/login?preset=");
	});
	test("renders every enabled server row with an icon-labelled action", () => {
		render(
			<PresetCards
				presets={[
					{
						slug: "cover",
						title: "Server cover",
						description: "Cover",
						type: "cover_page",
					},
					{
						slug: "index",
						title: "Server index",
						description: "Index",
						type: "index_sheet",
					},
				]}
			/>,
		);
		expect(screen.getByText("Server cover")).toBeTruthy();
		expect(screen.getByText("Server index")).toBeTruthy();
		expect(screen.getAllByRole("link", { name: /use preset/i })).toHaveLength(
			2,
		);
	});

	test("initializes each editor from fetched typed data", () => {
		render(
			<>
				<CoverPresetState
					preset="cover"
					data={{ instituteName: "Fetched institute" } as any}
				/>
				<IndexPresetState
					preset="index"
					data={{ subjectName: "Fetched subject" } as any}
				/>
			</>,
		);
		expect(screen.getByDisplayValue("Fetched institute")).toBeTruthy();
		expect(screen.getByText("Fetched subject")).toBeTruthy();
	});

	test("shows a not-found recovery action instead of blank editor data", () => {
		render(<CoverPresetState preset="missing" notFound />);
		expect(screen.getByText(/preset not found/i)).toBeTruthy();
		expect(screen.getByRole("link", { name: /start blank/i })).toBeTruthy();
	});

	test("route distinguishes NOT_FOUND from server errors and retries failures", () => {
		vi.mocked(CoverRoute.useSearch).mockReturnValue({ preset: "missing" });
		queryState.current = {
			isPending: false,
			isError: true,
			error: { code: "NOT_FOUND" },
			refetch: vi.fn(),
		};
		const view = render(<NewCoverPage />);
		expect(screen.getByText(/preset not found/i)).toBeTruthy();

		const refetch = vi.fn();
		queryState.current = {
			isPending: false,
			isError: true,
			error: { code: "INTERNAL_SERVER_ERROR" },
			refetch,
		};
		view.rerender(<NewCoverPage />);
		expect(screen.getByText(/could not load preset/i)).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: /retry/i }));
		expect(refetch).toHaveBeenCalledOnce();
	});

	test("a result update does not overwrite edits for the same preset", () => {
		vi.mocked(CoverRoute.useSearch).mockReturnValue({ preset: "cover" });
		queryState.current = {
			isPending: false,
			isError: false,
			data: { data: { instituteName: "First result" } },
		};
		const view = render(<NewCoverPage />);
		const input = screen.getByRole("textbox", { name: /institute name/i });
		fireEvent.change(input, { target: { value: "User edit" } });
		queryState.current = {
			isPending: false,
			isError: false,
			data: { data: { instituteName: "Refetched result" } },
		};
		view.rerender(<NewCoverPage />);
		expect(screen.getByDisplayValue("User edit")).toBeTruthy();
	});

	test("index route treats authentication errors as load failures", () => {
		vi.mocked(IndexRoute.useSearch).mockReturnValue({ preset: "index" });
		queryState.current = {
			isPending: false,
			isError: true,
			error: { code: "UNAUTHORIZED" },
			refetch: vi.fn(),
		};
		render(<NewIndexSheet />);
		expect(screen.getByText(/could not load preset/i)).toBeTruthy();
		expect(screen.queryByText(/preset not found/i)).toBeNull();
	});
});
