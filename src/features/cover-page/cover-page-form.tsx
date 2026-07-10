import type { ReactNode } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";
import type { CoverPageData } from "#/orpc/schemas/document";

const Field = ({
	id,
	label,
	children,
}: {
	id: string;
	label: string;
	children: ReactNode;
}) => (
	<div className="space-y-2">
		<Label htmlFor={id}>{label}</Label>
		{children}
	</div>
);

interface Props {
	data: CoverPageData;
	onChange: (data: CoverPageData) => void;
	onLogoFile: (file?: File) => void;
	onRemoveLogo: () => void;
}

export function CoverPageForm({
	data,
	onChange,
	onLogoFile,
	onRemoveLogo,
}: Props) {
	const input = (
		id: string,
		label: string,
		value: string,
		set: (value: string) => CoverPageData,
	) => (
		<Field id={id} label={label}>
			<Input
				id={id}
				value={value}
				onChange={(event) => onChange(set(event.target.value))}
			/>
		</Field>
	);
	return (
		<div className="space-y-5">
			{input(
				"cover-institution",
				"Institution name",
				data.instituteName,
				(value) => ({ ...data, instituteName: value }),
			)}
			{input(
				"cover-institution-short",
				"Institution short form (optional)",
				data.instituteShort,
				(value) => ({ ...data, instituteShort: value }),
			)}
			<Field id="cover-department" label="Department">
				<Textarea
					id="cover-department"
					value={data.department}
					onChange={(event) =>
						onChange({ ...data, department: event.target.value })
					}
				/>
			</Field>
			<Field id="cover-logo" label="Logo (optional)">
				<Input
					id="cover-logo"
					aria-label="Logo image"
					accept="image/png,image/jpeg,image/webp"
					type="file"
					onChange={(event) => onLogoFile(event.target.files?.[0])}
				/>
			</Field>
			{data.logoDataUrl && (
				<Button type="button" variant="outline" onClick={onRemoveLogo}>
					Remove logo
				</Button>
			)}
			{input("cover-document-type", "Document type", data.docType, (value) => ({
				...data,
				docType: value,
			}))}

			<div className="border-t pt-5">
				<h2 className="mb-4 text-sm font-semibold uppercase tracking-wide">
					Submitted by
				</h2>
				<div className="space-y-4">
					{input(
						"cover-by-name",
						"Submitted by name",
						data.submittedBy.name,
						(value) => ({
							...data,
							submittedBy: { ...data.submittedBy, name: value },
						}),
					)}
					<div className="grid grid-cols-2 gap-3">
						{input(
							"cover-by-reg",
							"Registration no.",
							data.submittedBy.regNo,
							(value) => ({
								...data,
								submittedBy: { ...data.submittedBy, regNo: value },
							}),
						)}
						{input(
							"cover-by-roll",
							"Roll no.",
							data.submittedBy.roll,
							(value) => ({
								...data,
								submittedBy: { ...data.submittedBy, roll: value },
							}),
						)}
					</div>
					{input(
						"cover-by-subject",
						"Subject name",
						data.submittedBy.subjectName,
						(value) => ({
							...data,
							submittedBy: { ...data.submittedBy, subjectName: value },
						}),
					)}
					<div className="grid grid-cols-2 gap-3">
						{input(
							"cover-by-code",
							"Subject code",
							data.submittedBy.subjectCode,
							(value) => ({
								...data,
								submittedBy: { ...data.submittedBy, subjectCode: value },
							}),
						)}
						{input(
							"cover-by-session",
							"Session",
							data.submittedBy.session,
							(value) => ({
								...data,
								submittedBy: { ...data.submittedBy, session: value },
							}),
						)}
					</div>
					{input(
						"cover-by-semester",
						"Semester",
						data.submittedBy.semester,
						(value) => ({
							...data,
							submittedBy: { ...data.submittedBy, semester: value },
						}),
					)}
				</div>
			</div>

			<div className="border-t pt-5">
				<h2 className="mb-4 text-sm font-semibold uppercase tracking-wide">
					Submitted to
				</h2>
				<div className="space-y-4">
					{input(
						"cover-to-name",
						"Submitted to name",
						data.submittedTo.name,
						(value) => ({
							...data,
							submittedTo: { ...data.submittedTo, name: value },
						}),
					)}
					{input(
						"cover-to-designation",
						"Designation",
						data.submittedTo.designation,
						(value) => ({
							...data,
							submittedTo: { ...data.submittedTo, designation: value },
						}),
					)}
					{input(
						"cover-to-department",
						"Submitted to department",
						data.submittedTo.department,
						(value) => ({
							...data,
							submittedTo: { ...data.submittedTo, department: value },
						}),
					)}
				</div>
			</div>
		</div>
	);
}
