import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const css = readFileSync(new URL("./preview.css", import.meta.url), "utf8");
const styles = readFileSync(
	new URL("../../styles.css", import.meta.url),
	"utf8",
);
const adminUi = readFileSync(
	new URL("../admin/admin-ui.tsx", import.meta.url),
	"utf8",
);

describe("print layout contract", () => {
	test("resets the editor shell and preview host around the A4 page", () => {
		expect(css).toMatch(
			/\[data-editor-main\][\s\S]*display:\s*block\s*!important/,
		);
		expect(css).toMatch(
			/\[data-preview-host\][\s\S]*padding:\s*0\s*!important/,
		);
		expect(css).toMatch(/\[data-preview-host\][\s\S]*width:\s*210mm/);
	});

	test("prevents global emergency wrapping from changing print typography", () => {
		expect(css).toMatch(/\.a4-page\s*\{[\s\S]*overflow-wrap:\s*normal/);
	});

	test("keeps the cover border structurally equivalent to the index border", () => {
		expect(css).toMatch(
			/\.index-page-border,\s*\.cover-page-border\s*\{[\s\S]*display:\s*flex[\s\S]*flex-direction:\s*column/,
		);
	});
});

describe("short landscape preview layout", () => {
	test("spans the editor grid and uses the viewport height budget", () => {
		expect(css).toMatch(
			/@media\s*\(orientation:\s*landscape\)\s*and\s*\(max-height:\s*700px\)[\s\S]*\[data-preview-host\]\s*\{[\s\S]*grid-column:\s*1\s*\/\s*-1[\s\S]*height:\s*calc\(100vh\s*-\s*4rem\)/,
		);
	});
});

describe("application color contract", () => {
	test("defines semantic application and sidebar surfaces in both modes", () => {
		for (const selector of [":root", ".dark"]) {
			const block = styles.match(
				new RegExp(`\\${selector}\\s*\\{([\\s\\S]*?)\\n\\}`),
			)?.[1];

			expect(block).toBeDefined();
			expect(block).toMatch(/--background:/);
			expect(block).toMatch(/--card:/);
			expect(block).toMatch(/--sidebar:/);
			expect(block).toMatch(/--sidebar-foreground:/);
		}
	});

	test("does not hard-code light-only admin surfaces", () => {
		expect(adminUi).not.toContain("bg-white/60");
	});
});
