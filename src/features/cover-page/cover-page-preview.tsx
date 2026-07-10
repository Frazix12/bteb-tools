import { A4Page } from "#/features/preview/a4-page";
import type { CoverPageData } from "#/orpc/schemas/document";
import { deriveAssignmentHeading } from "./derive-heading";

const DetailRows = ({ rows }: { rows: [string, string][] }) => (
	<>
		{rows.map(([label, value]) => (
			<div className="contents" key={label}>
				<div className="cfl">{label}</div>
				<div className="cfc">:</div>
				<div className="cfv">{value}</div>
			</div>
		))}
	</>
);

export function CoverPagePreview({ data }: { data: CoverPageData }) {
	const by: [string, string][] = [
		["Name", data.submittedBy.name],
		["Reg No.", data.submittedBy.regNo],
		["Roll", data.submittedBy.roll],
		["Subject Name", data.submittedBy.subjectName],
		["Subject Code", data.submittedBy.subjectCode],
		["Session", data.submittedBy.session],
		["Semester", data.submittedBy.semester],
	];
	const to: [string, string][] = [
		["Name", data.submittedTo.name],
		["Designation", data.submittedTo.designation],
		["Department", data.submittedTo.department],
	];
	return (
		<div className="cover-preview-wrap">
			<A4Page className="cover-page">
				<div className="cover-page-border" data-testid="cover-preview">
					<div className="cover-page-inner">
						<div className="cover-inst-block">
							<div className="cover-inst-name">{data.instituteName}</div>
							{data.instituteShort && (
								<div className="cover-inst-short">{data.instituteShort}</div>
							)}
						</div>
						{data.department && (
							<div className="cover-dept">{data.department}</div>
						)}
						<div className="cover-logo-wrap">
							{data.logoDataUrl ? (
								<img alt="Institution logo" src={data.logoDataUrl} />
							) : (
								<div className="cover-logo-placeholder">Logo</div>
							)}
						</div>
						<div className="cover-heading-box">
							<span>
								{deriveAssignmentHeading(
									data.submittedBy.subjectName,
									data.docType,
								)}
							</span>
						</div>
						<div className="cover-columns">
							<div className="cover-col">
								<div className="cover-col-title cover-col-title-row">
									Submitted by :
								</div>
								<DetailRows rows={by} />
							</div>
							<div className="cover-divider" />
							<div className="cover-col">
								<div className="cover-col-title cover-col-title-row">
									Submitted to :
								</div>
								<DetailRows rows={to} />
							</div>
						</div>
					</div>
				</div>
			</A4Page>
		</div>
	);
}
