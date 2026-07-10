import { createFileRoute, notFound } from "@tanstack/react-router";

import { CoverPagePreview } from "#/features/cover-page/cover-page-preview";
import { IndexSheetPreview } from "#/features/index-sheet/index-sheet-preview";

export const Route = createFileRoute("/visual-fixtures")({
	beforeLoad: () => {
		if (import.meta.env.PROD) throw notFound();
	},
	validateSearch: (search: Record<string, unknown>) => ({
		kind: search.kind === "cover" ? ("cover" as const) : ("index" as const),
		stress: search.stress === true || search.stress === "true",
	}),
	component: VisualFixtures,
});

const entries = Array.from({ length: 11 }, (_, index) => ({
	name:
		index === 0
			? "ডিজিটাল ইলেকট্রনিক্স পরীক্ষণ ও mixed-script measurement"
			: `Experiment ${index + 1}`,
	issueDate: "2026-07-01",
	submitDate: "2026-07-10",
	pageNo: String(index + 2),
}));

function VisualFixtures() {
	const { kind, stress } = Route.useSearch();
	const fixtureEntries = stress
		? entries.map((entry, index) =>
				index === 0
					? {
							...entry,
							name: "ডিজিটাল ইলেকট্রনিক্স পরীক্ষণ ও mixed-script measurement of voltage^2 current^2 resistance^2 capacitance^2 inductance^2 across a complete series-parallel laboratory circuit",
						}
					: entry,
			)
		: entries;
	return (
		<main className="editor-layout" data-editor-main>
			<section className="preview-host" data-preview-host>
				{kind === "cover" ? (
					<CoverPagePreview
						data={{
							schemaVersion: 1,
							exportedAt: "2026-07-10T00:00:00.000Z",
							type: "cover-page",
							instituteName: "Bangladesh Technical Education Board",
							instituteShort: "BTEB",
							department: "Department of Computer Science and Technology",
							docType: "Assignment",
							logoDataUrl: "",
							submittedBy: {
								name: "Sample Student",
								regNo: "1234567890",
								roll: "654321",
								subjectName: "Database Management System",
								subjectCode: "28541",
								session: "2025-26",
								semester: "Fifth",
							},
							submittedTo: {
								name: "Sample Teacher",
								designation: "Instructor",
								department: "Computer Science and Technology",
							},
						}}
					/>
				) : (
					<IndexSheetPreview
						data={{
							schemaVersion: 1,
							exportedAt: "2026-07-10T00:00:00.000Z",
							title: "INDEX",
							rowsPerPage: 10,
							showPageNo: true,
							entries: fixtureEntries,
						}}
					/>
				)}
			</section>
		</main>
	);
}
