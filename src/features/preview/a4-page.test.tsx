// @vitest-environment jsdom
import { act, render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { A4Page } from "./a4-page";
import {
	A4_HEIGHT_PX,
	A4_WIDTH_PX,
	calculatePageScale,
} from "./use-page-scale";

class ResizeObserverStub {
	static instances: ResizeObserverStub[] = [];

	disconnect = vi.fn();
	observe = vi.fn();

	constructor(readonly callback: ResizeObserverCallback) {
		ResizeObserverStub.instances.push(this);
	}
}

describe("A4 preview scaling", () => {
	test("shrinks an A4 page to fit a narrow container with the reference gutter", () => {
		expect(calculatePageScale(400)).toBeCloseTo(396 / A4_WIDTH_PX);
	});

	test("never enlarges an A4 page in a wide container", () => {
		expect(calculatePageScale(A4_WIDTH_PX + 200)).toBe(1);
	});

	test("uses fixed CSS A4 dimensions", () => {
		expect(A4_WIDTH_PX).toBeCloseTo(210 * (96 / 25.4));
		expect(A4_HEIGHT_PX).toBeCloseTo(297 * (96 / 25.4));
	});
});

describe("A4Page", () => {
	beforeEach(() => {
		ResizeObserverStub.instances = [];
		vi.stubGlobal("ResizeObserver", ResizeObserverStub);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("renders the reference frame and page structure", () => {
		const { container } = render(<A4Page>Preview</A4Page>);
		const frame = container.querySelector<HTMLElement>(".page-frame");
		const page = container.querySelector<HTMLElement>(".page-frame > .a4-page");

		expect(frame).toBeTruthy();
		expect(page?.textContent).toBe("Preview");
		expect(page?.style.height).toBe("297mm");
		expect(page?.style.width).toBe("210mm");
	});

	test("updates from its parent width and cleans up observers and browser listeners", () => {
		const removeEventListener = vi.spyOn(window, "removeEventListener");
		const { container, unmount } = render(
			<div data-testid="preview-wrap">
				<A4Page>Preview</A4Page>
			</div>,
		);
		const wrap = container.querySelector<HTMLElement>(
			"[data-testid='preview-wrap']",
		);
		const frame = container.querySelector<HTMLElement>(".page-frame");
		if (!wrap || !frame) throw new Error("Expected preview elements");
		Object.defineProperty(wrap, "clientWidth", {
			configurable: true,
			value: 400,
		});

		act(() =>
			ResizeObserverStub.instances[0]?.callback(
				[],
				ResizeObserverStub.instances[0],
			),
		);

		expect(frame.style.width).toBe(
			`${A4_WIDTH_PX * calculatePageScale(400)}px`,
		);
		unmount();
		expect(ResizeObserverStub.instances[0]?.disconnect).toHaveBeenCalledOnce();
		expect(removeEventListener).toHaveBeenCalledWith(
			"resize",
			expect.any(Function),
		);
		expect(removeEventListener).toHaveBeenCalledWith(
			"orientationchange",
			expect.any(Function),
		);
	});

	test("server-renders without reading window", () => {
		expect(() => renderToString(<A4Page>Preview</A4Page>)).not.toThrow();
	});
});
