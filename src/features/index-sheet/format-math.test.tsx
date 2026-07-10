import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { renderCaretMath } from "./format-math";

function render(value: string) {
	return renderToStaticMarkup(renderCaretMath(value));
}

describe("renderCaretMath", () => {
	it("renders a single-digit exponent", () => {
		expect(render("y^2")).toBe("y<sup>2</sup>");
	});

	it("renders a multi-digit exponent", () => {
		expect(render("x^10")).toBe("x<sup>10</sup>");
	});

	it("renders exponents within Bengali text", () => {
		expect(render("ক্ষেত্রফল r^২ বর্গ একক")).toBe("ক্ষেত্রফল r<sup>২</sup> বর্গ একক");
	});

	it("preserves an unmatched caret as text", () => {
		expect(render("অসম্পূর্ণ ^ চিহ্ন")).toBe("অসম্পূর্ণ ^ চিহ্ন");
	});

	it("escapes literal HTML instead of injecting source elements", () => {
		const markup = render('<img src=x onerror="alert(1)">^2');

		expect(markup).toBe(
			"&lt;img src=x onerror=&quot;alert(1)&quot;&gt;<sup>2</sup>",
		);
		expect(markup).not.toContain("<img");
	});
});
