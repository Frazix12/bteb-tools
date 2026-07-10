import { A4Page } from "#/features/preview/a4-page";
import type { IndexSheetData } from "#/orpc/schemas/document";

import { formatIndexDate } from "./format-date";
import { paginateIndexEntries } from "./paginate";

export function IndexSheetPreview({ data }: { data: IndexSheetData }) {
	const pages = paginateIndexEntries(data.entries);
	const columns = data.showPageNo
		? "8% 34% 10% 14% 14% 20%"
		: "8% 40% 14% 14% 24%";

	return (
		<div className="index-preview-wrap">
			{pages.map((rows, pageIndex) => (
				<A4Page className="index-page" key={rows[0]?.sequence}>
					<div className="index-page-border" data-testid="index-preview-page">
						<h2 className="index-page-title">{data.title || "INDEX"}</h2>
						<div className="index-table-wrap">
							<div className="idx-table">
								<div
									className="idx-row idx-header"
									style={{ gridTemplateColumns: columns }}
								>
									<div className="idx-cell">
										SI
										<br />
										NO.
									</div>
									<div className="idx-cell">Experiment Name</div>
									{data.showPageNo && (
										<div className="idx-cell">
											Page
											<br />
											No.
										</div>
									)}
									<div className="idx-cell">
										Issue
										<br />
										Date
									</div>
									<div className="idx-cell">
										Submit
										<br />
										Date
									</div>
									<div className="idx-cell">Signature</div>
								</div>
								<div className="idx-body">
									{rows.map((row) => (
										<div
											className={`idx-row${row.zebra ? " zebra" : ""}`}
											key={row.sequence}
											style={{ gridTemplateColumns: columns }}
										>
											<div className="idx-cell si">{row.sequence}</div>
											<div className="idx-cell name">
												{row.entry?.name ?? ""}
											</div>
											{data.showPageNo && (
												<div className="idx-cell date">
													{row.entry?.pageNo ?? ""}
												</div>
											)}
											<div className="idx-cell date">
												{formatIndexDate(row.entry?.issueDate ?? "")}
											</div>
											<div className="idx-cell date">
												{formatIndexDate(row.entry?.submitDate ?? "")}
											</div>
											<div className="idx-cell sig" />
										</div>
									))}
								</div>
							</div>
						</div>
						<div className="index-page-footer">
							Page {pageIndex + 1} of {pages.length}
						</div>
					</div>
				</A4Page>
			))}
		</div>
	);
}
