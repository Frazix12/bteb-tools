export function deriveAssignmentHeading(
	subjectRaw: string,
	documentType: string,
) {
	const type = documentType.trim() || "Assignment";
	const cleaned = subjectRaw
		.replace(/[0-9]+/g, " ")
		.replace(/-/g, " ")
		.replace(/\s+/g, " ")
		.trim();

	if (!cleaned) return type;
	const words = cleaned.split(" ");
	if (words.length !== 1) return type;
	const word = words[0] ?? "";
	return `${word.charAt(0).toUpperCase()}${word.slice(1)} ${type}`;
}
