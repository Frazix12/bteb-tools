import { useEffect, useRef, useState } from "react";

export const CSS_MM_TO_PX = 96 / 25.4;
export const A4_WIDTH_PX = 210 * CSS_MM_TO_PX;
export const A4_HEIGHT_PX = 297 * CSS_MM_TO_PX;

const PREVIEW_GUTTER_PX = 4;

export function calculatePageScale(
	containerWidth: number,
	availableHeight?: number,
) {
	const widthScale =
		Math.max(0, containerWidth - PREVIEW_GUTTER_PX) / A4_WIDTH_PX;
	const heightScale =
		availableHeight !== undefined && availableHeight > 0
			? Math.max(0, availableHeight - PREVIEW_GUTTER_PX) / A4_HEIGHT_PX
			: 1;
	return Math.min(1, widthScale, heightScale);
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
				const availableHeight =
					window.innerHeight -
					container.getBoundingClientRect().top -
					PREVIEW_GUTTER_PX;
				setScale(calculatePageScale(container.clientWidth, availableHeight));
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
