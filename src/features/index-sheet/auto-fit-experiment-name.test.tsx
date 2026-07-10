// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { AutoFitExperimentName } from "./auto-fit-experiment-name";

class ResizeObserverStub {
	static instances: ResizeObserverStub[] = [];

	disconnect = vi.fn();
	observe = vi.fn();
	unobserve = vi.fn();

	constructor(readonly callback: ResizeObserverCallback) {
		ResizeObserverStub.instances.push(this);
	}
}

describe("AutoFitExperimentName", () => {
	beforeEach(() => {
		ResizeObserverStub.instances = [];
		vi.stubGlobal("ResizeObserver", ResizeObserverStub);
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	test("keeps fitting content at 19px", () => {
		vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(40);
		vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(40);

		const { getByTestId } = render(<AutoFitExperimentName value="Fits" />);

		expect(getByTestId("auto-fit-experiment-name").style.fontSize).toBe("19px");
	});

	test("repeatedly shrinks overflowing content until it fits", () => {
		vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(40);
		vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(
			function (this: HTMLElement) {
				return Number.parseInt(this.style.fontSize, 10) > 15 ? 60 : 40;
			},
		);

		const { getByTestId } = render(<AutoFitExperimentName value="Long name" />);

		expect(getByTestId("auto-fit-experiment-name").style.fontSize).toBe("15px");
	});

	test("stops shrinking persistent overflow at 11px", () => {
		vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(40);
		vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(60);

		const { getByTestId } = render(<AutoFitExperimentName value="Very long" />);

		expect(getByTestId("auto-fit-experiment-name").style.fontSize).toBe("11px");
	});

	test("fits again when resize observation fires", () => {
		let availableHeight = 40;
		vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(
			() => availableHeight,
		);
		vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(
			function (this: HTMLElement) {
				return Number.parseInt(this.style.fontSize, 10) > 15 ? 60 : 40;
			},
		);
		const { getByTestId } = render(<AutoFitExperimentName value="Resize me" />);
		const content = getByTestId("auto-fit-experiment-name");
		expect(content.style.fontSize).toBe("15px");

		availableHeight = 60;
		act(() =>
			ResizeObserverStub.instances[0]?.callback(
				[],
				ResizeObserverStub.instances[0],
			),
		);

		expect(content.style.fontSize).toBe("19px");
	});
});
