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
		Reflect.deleteProperty(document, "fonts");
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

	test("refits after fonts load and cancels font work on unmount", async () => {
		const fonts = new EventTarget();
		let resolveFonts: (value: EventTarget) => void = () => undefined;
		Object.defineProperty(fonts, "ready", {
			value: new Promise<EventTarget>((resolve) => {
				resolveFonts = resolve;
			}),
		});
		const removeEventListener = vi.spyOn(fonts, "removeEventListener");
		Object.defineProperty(document, "fonts", {
			configurable: true,
			value: fonts,
		});
		let fittedSize = 15;
		vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(40);
		vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(
			function (this: HTMLElement) {
				return Number.parseInt(this.style.fontSize, 10) > fittedSize ? 60 : 40;
			},
		);
		const { getByTestId, unmount } = render(
			<AutoFitExperimentName value="Font-sensitive name" />,
		);
		const content = getByTestId("auto-fit-experiment-name");
		expect(content.style.fontSize).toBe("15px");

		fittedSize = 13;
		act(() => fonts.dispatchEvent(new Event("loadingdone")));

		expect(content.style.fontSize).toBe("13px");
		unmount();
		expect(removeEventListener).toHaveBeenCalledWith(
			"loadingdone",
			expect.any(Function),
		);
		fittedSize = 12;
		resolveFonts(fonts);
		await act(async () => Promise.resolve());
		expect(content.style.fontSize).toBe("13px");
	});
});
