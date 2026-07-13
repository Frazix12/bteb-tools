// @vitest-environment jsdom
// biome-ignore-all lint/suspicious/noExplicitAny: deliberately minimal component mocks
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

const {
	queryState,
	routeState,
	locationState,
	coverEditorProps,
	indexEditorProps,
} = vi.hoisted(() => ({
	queryState: { current: {} as any },
	routeState: { user: null as null | { id: string } },
	locationState: { href: "/current" },
	coverEditorProps: vi.fn(),
	indexEditorProps: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
	useQuery: () => queryState.current,
}));

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children, to, search }: any) => {
		const supplied = Object.entries(search ?? {}).filter(
			([, value]) => value !== undefined,
		);
		const query = new URLSearchParams(
			supplied as [string, string][],
		).toString();
		return <a href={query ? `${to}?${query}` : to}>{children}</a>;
	},
	createFileRoute: () => (options: any) => ({
		...options,
		useSearch: vi.fn(),
		useRouteContext: vi.fn(() => ({ user: routeState.user })),
	}),
	useLocation: vi.fn(() => ({ href: locationState.href })),
}));

vi.mock("#/features/cover-page/cover-page-editor", () => ({
	CoverPageEditor: (props: any) => {
		coverEditorProps(props);
		return (
			<input
				aria-label="Institute name"
				defaultValue={props.initialData.instituteName}
			/>
		);
	},
}));
vi.mock("#/features/index-sheet/index-sheet-editor", () => ({
	IndexSheetEditor: (props: any) => {
		indexEditorProps(props);
		return <p>{props.initialData.subjectName}</p>;
	},
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
	CoverPresetDocumentState,
	NewCoverPage,
} from "#/features/presets/new-cover-page";
import {
	IndexPresetDocumentState,
	NewIndexSheet,
} from "#/features/presets/new-index-sheet";
import { PresetsPage } from "#/features/presets/presets-page";
import { Route as PresetsRoute } from "#/routes/_auth/presets";

afterEach(() => {
	cleanup();
	routeState.user = null;
	locationState.href = "/current";
	coverEditorProps.mockClear();
	indexEditorProps.mockClear();
});

describe("database-backed preset pages", () => {
	test("route renders the real presets page", () => {
		queryState.current = { isPending: false, data: [] };
		routeState.user = null;
		const Component = (
			PresetsRoute as unknown as { component: React.ComponentType }
		).component;
		render(<Component />);
		expect(screen.getByText("Start from a preset")).toBeTruthy();
		expect(screen.queryByText(/Hello/)).toBeNull();
	});

	test("uses guest-safe instructions and sign-in navigation", () => {
		queryState.current = { isPending: false, data: [] };
		render(<PresetsPage user={null} />);
		expect(screen.getByText(/then print or save as PDF/i)).toBeTruthy();
		expect(
			screen.getByRole("link", { name: /sign in/i }).getAttribute("href"),
		).toBe("/login");
	});

	test.each([
		{
			name: "cover page",
			Component: NewCoverPage,
			propsSpy: coverEditorProps,
			href: "/cover-page/new?preset=cover",
		},
		{
			name: "index sheet",
			Component: NewIndexSheet,
			propsSpy: indexEditorProps,
			href: "/index-sheet/new?preset=index",
		},
	])("maps route authentication and the exact location for the $name editor", ({
		Component,
		propsSpy,
		href,
	}) => {
		queryState.current = { isPending: false, isError: false };
		const view = render(
			<Component isAuthenticated={false} signInRedirect={href} />,
		);
		expect(propsSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				canSave: false,
				canUseAi: false,
				signInRedirect: href,
			}),
		);

		view.rerender(<Component isAuthenticated={true} signInRedirect={href} />);
		expect(propsSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				canSave: true,
				canUseAi: true,
				signInRedirect: href,
			}),
		);
	});
	test("renders every enabled server row with an icon-labelled action", () => {
		queryState.current = {
			isPending: false,
			data: [
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
			],
		};
		render(<PresetsPage user={null} />);
		expect(screen.getByText("Server cover")).toBeTruthy();
		expect(screen.getByText("Server index")).toBeTruthy();
		expect(screen.getAllByRole("link", { name: /use preset/i })).toHaveLength(
			2,
		);
	});

	test("initializes each editor from fetched typed data", () => {
		render(
			<>
				<CoverPresetDocumentState
					preset="cover"
					data={{ instituteName: "Fetched institute" } as any}
				/>
				<IndexPresetDocumentState
					preset="index"
					data={{ subjectName: "Fetched subject" } as any}
				/>
			</>,
		);
		expect(screen.getByDisplayValue("Fetched institute")).toBeTruthy();
		expect(screen.getByText("Fetched subject")).toBeTruthy();
	});

	test("shows a not-found recovery action instead of blank editor data", () => {
		render(<CoverPresetDocumentState preset="missing" notFound />);
		expect(screen.getByText(/preset not found/i)).toBeTruthy();
		expect(screen.getByRole("link", { name: /start blank/i })).toBeTruthy();
	});

	test("route distinguishes NOT_FOUND from server errors and retries failures", () => {
		queryState.current = {
			isPending: false,
			isError: true,
			error: { code: "NOT_FOUND" },
			refetch: vi.fn(),
		};
		const view = render(
			<NewCoverPage
				isAuthenticated={true}
				preset="missing"
				signInRedirect="/current"
			/>,
		);
		expect(screen.getByText(/preset not found/i)).toBeTruthy();

		const refetch = vi.fn();
		queryState.current = {
			isPending: false,
			isError: true,
			error: { code: "INTERNAL_SERVER_ERROR" },
			refetch,
		};
		view.rerender(
			<NewCoverPage
				isAuthenticated={true}
				preset="missing"
				signInRedirect="/current"
			/>,
		);
		expect(screen.getByText(/could not load preset/i)).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: /retry/i }));
		expect(refetch).toHaveBeenCalledOnce();
	});

	test("a result update does not overwrite edits for the same preset", () => {
		queryState.current = {
			isPending: false,
			isError: false,
			data: { data: { instituteName: "First result" } },
		};
		const view = render(
			<NewCoverPage
				isAuthenticated={true}
				preset="cover"
				signInRedirect="/current"
			/>,
		);
		const input = screen.getByRole("textbox", { name: /institute name/i });
		fireEvent.change(input, { target: { value: "User edit" } });
		queryState.current = {
			isPending: false,
			isError: false,
			data: { data: { instituteName: "Refetched result" } },
		};
		view.rerender(
			<NewCoverPage
				isAuthenticated={true}
				preset="cover"
				signInRedirect="/current"
			/>,
		);
		expect(screen.getByDisplayValue("User edit")).toBeTruthy();
	});

	test("index route treats authentication errors as load failures", () => {
		queryState.current = {
			isPending: false,
			isError: true,
			error: { code: "UNAUTHORIZED" },
			refetch: vi.fn(),
		};
		render(
			<NewIndexSheet
				isAuthenticated={true}
				preset="index"
				signInRedirect="/current"
			/>,
		);
		expect(screen.getByText(/could not load preset/i)).toBeTruthy();
		expect(screen.queryByText(/preset not found/i)).toBeNull();
	});
});
