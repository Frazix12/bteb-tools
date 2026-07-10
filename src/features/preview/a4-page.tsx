import type { ReactNode } from "react";

import { cn } from "#/lib/utils";

import { A4_HEIGHT_PX, A4_WIDTH_PX, usePageScale } from "./use-page-scale";

interface A4PageProps {
	children: ReactNode;
	className?: string;
}

export function A4Page({ children, className }: A4PageProps) {
	const { frameRef, scale } = usePageScale();

	return (
		<div
			className="page-frame"
			ref={frameRef}
			style={{ height: A4_HEIGHT_PX * scale, width: A4_WIDTH_PX * scale }}
		>
			<div
				className={cn("a4-page", className)}
				style={{
					height: "297mm",
					transform: `scale(${scale})`,
					width: "210mm",
				}}
			>
				{children}
			</div>
		</div>
	);
}
