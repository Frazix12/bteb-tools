import { useEffect, useRef, useState } from "react";

export const CSS_MM_TO_PX = 96 / 25.4;
export const A4_WIDTH_PX = 210 * CSS_MM_TO_PX;
export const A4_HEIGHT_PX = 297 * CSS_MM_TO_PX;

const PREVIEW_GUTTER_PX = 4;

export function calculatePageScale(containerWidth: number) {
	if (containerWidth <= 0) return 1;
	const availableWidth = Math.max(
		0,
		Math.min(containerWidth, containerWidth - PREVIEW_GUTTER_PX),
	);
	return Math.min(1, availableWidth / A4_WIDTH_PX);
}

export function usePageScale() {
	const frameRef = useRef<HTMLDivElement>(null);
	const [scale, setScale] = useState(1);

	useEffect(() => {
		const frame = frameRef.current;
		const container = frame?.parentElement;
		if (!container) return;

		const updateScale = () => {
			if (container.clientWidth > 0) {
				setScale(calculatePageScale(container.clientWidth));
			}
		};

		updateScale();
		const observer =
			typeof ResizeObserver === "undefined"
				? null
				: new ResizeObserver(updateScale);
		observer?.observe(container);
		window.addEventListener("resize", updateScale);
		window.addEventListener("orientationchange", updateScale);

		return () => {
			observer?.disconnect();
			window.removeEventListener("resize", updateScale);
			window.removeEventListener("orientationchange", updateScale);
		};
	}, []);

	return { frameRef, scale };
}
