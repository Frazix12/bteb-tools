import type { CoverPageData } from "#/orpc/schemas/document";

export function createBlankCoverPage(): CoverPageData {
	return {
		schemaVersion: 1,
		exportedAt: new Date().toISOString(),
		type: "cover-page",
		instituteName: "",
		instituteShort: "",
		department: "",
		docType: "Assignment",
		logoDataUrl: "",
		submittedBy: {
			name: "",
			regNo: "",
			roll: "",
			subjectName: "",
			subjectCode: "",
			session: "",
			semester: "",
		},
		submittedTo: { name: "", designation: "", department: "" },
	};
}
