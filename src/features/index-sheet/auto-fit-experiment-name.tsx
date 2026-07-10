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
			if (value.length === 0) return;
			while (
				content.scrollHeight > content.clientHeight &&
				nextSize > MIN_FONT_SIZE
			) {
				nextSize -= 1;
				content.style.fontSize = `${nextSize}px`;
			}
		};

		fitContent();
		const observer =
			typeof ResizeObserver === "undefined"
				? undefined
				: new ResizeObserver(fitContent);
		observer?.observe(content);

		let cancelled = false;
		const fonts = document.fonts;
		const refitAfterFontsLoad = () => {
			if (!cancelled) fitContent();
		};
		fonts?.addEventListener("loadingdone", refitAfterFontsLoad);
		void fonts?.ready.then(refitAfterFontsLoad);

		return () => {
			cancelled = true;
			observer?.disconnect();
			fonts?.removeEventListener("loadingdone", refitAfterFontsLoad);
		};
	}, [value]);

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
