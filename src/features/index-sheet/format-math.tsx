import type { ReactNode } from "react";

export function renderCaretMath(value: string): ReactNode[] {
	const parts: ReactNode[] = [];
	const exponentPattern = /\^([\p{L}\p{N}]+)/gu;
	let previousEnd = 0;

	for (const match of value.matchAll(exponentPattern)) {
		const matchStart = match.index;
		parts.push(value.slice(previousEnd, matchStart));
		parts.push(<sup key={matchStart}>{match[1]}</sup>);
		previousEnd = matchStart + match[0].length;
	}

	parts.push(value.slice(previousEnd));
	return parts;
}
