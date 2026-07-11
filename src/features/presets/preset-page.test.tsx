// @vitest-environment jsdom
// biome-ignore-all lint/suspicious/noExplicitAny: deliberately minimal component mocks
import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children, to, search }: any) => (
		<a href={`${to}?preset=${search?.preset ?? ""}`}>{children}</a>
	),
	createFileRoute: () => (options: any) => ({ ...options, useSearch: vi.fn() }),
}));

vi.mock("#/features/cover-page/cover-page-editor", () => ({
	CoverPageEditor: ({ initialData }: any) => <p>{initialData.instituteName}</p>,
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

import { PresetDocumentState as CoverPresetState } from "#/routes/_auth/cover-page/new";
import { PresetDocumentState as IndexPresetState } from "#/routes/_auth/index-sheet/new";
import { PresetCards } from "#/routes/_auth/presets";

describe("database-backed preset pages", () => {
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
		expect(screen.getByText("Fetched institute")).toBeTruthy();
		expect(screen.getByText("Fetched subject")).toBeTruthy();
	});

	test("shows a not-found recovery action instead of blank editor data", () => {
		render(<CoverPresetState preset="missing" notFound />);
		expect(screen.getByText(/preset not found/i)).toBeTruthy();
		expect(screen.getByRole("link", { name: /start blank/i })).toBeTruthy();
	});
});
