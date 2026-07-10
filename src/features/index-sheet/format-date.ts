export function formatIndexDate(isoDate: string) {
	if (!isoDate) return "";
	const [year = "", month = "", day = ""] = isoDate.split("-");
	return `${day}/${month}/${year.slice(-2)}`;
}
