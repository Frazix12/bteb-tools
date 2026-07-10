import { useLayoutEffect, useRef } from "react";

import { renderCaretMath } from "./format-math";

const MAX_FONT_SIZE = 19;
const MIN_FONT_SIZE = 11;

export function AutoFitExperimentName({ value }: { value: string }) {
	const contentRef = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		const content = contentRef.current;
		if (!content) return;

		const fitContent = () => {
			let nextSize = MAX_FONT_SIZE;
			content.style.fontSize = `${nextSize}px`;
			while (
				content.scrollHeight > content.clientHeight &&
				nextSize > MIN_FONT_SIZE
			) {
				nextSize -= 1;
				content.style.fontSize = `${nextSize}px`;
			}
		};

		fitContent();
		if (typeof ResizeObserver === "undefined") return;
		const observer = new ResizeObserver(fitContent);
		observer.observe(content);
		return () => observer.disconnect();
	});

	return (
		<div
			className="auto-fit-experiment-name"
			data-testid="auto-fit-experiment-name"
			ref={contentRef}
			style={{ fontSize: `${MAX_FONT_SIZE}px` }}
		>
			{renderCaretMath(value)}
		</div>
	);
}
