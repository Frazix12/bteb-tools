# Index Name Overflow and Inline Math Design

## Goal

Keep long experiment names inside their fixed index-table rows without changing the reference A4 pagination, and display simple caret exponents such as `y^2` as proper superscripts.

## Scope

The overflow and math changes affect only experiment-name cells in the Index Sheet preview and printed/PDF output. Adaptive page scaling applies to both Index Sheet and Cover Page previews. The work does not change saved or exported text, row count, pagination, column widths, dates, page numbers, signatures, or printed A4 dimensions.

## Overflow behavior

Each experiment-name cell starts at the reference 19px font size. After layout, a small component measures whether its text content exceeds the cell's available height. When it overflows, the component reduces the font size one pixel at a time until the content fits or reaches 11px.

The calculation reruns when the text changes or the cell is resized. The cell also uses hidden overflow as a final print-safety guard so content can never cross a row border. Short names remain at 19px.

## Inline math behavior

A pure formatter recognizes caret exponent notation where `^` is followed by an alphanumeric exponent. Examples:

- `y^2` renders as `y²` using semantic `<sup>2</sup>` markup.
- `x^10` renders with `10` as one superscript.
- Bengali and ordinary Latin text remain unchanged.
- A caret without an exponent remains literal.

The formatter never accepts or injects HTML, and the underlying document data remains the original plain text for editing and JSON compatibility.

## Components and data flow

`IndexSheetPreview` passes each saved experiment name to a focused auto-fit text component. That component uses a pure caret-tokenizer for its React children and owns only the measurement/font-size behavior. No editor or persistence API changes are required.

The shared A4 scaler observes both the preview container's width and its available viewport height. It chooses the smaller scale required to fit the complete page, never enlarging beyond 100%. The calculation reserves normal page gutters and responds to resize and orientation changes.

On portrait phones the page primarily fits by width. On short landscape screens the editor switches to a focused, full-width preview layout so more of the viewport is available before the page is reduced. Multi-page index sheets remain a vertical list: scrolling moves between complete pages, never through a clipped page viewport.

## Testing

- Unit tests prove caret parsing for single-character, multi-character, mixed Bengali/Latin, and unmatched-caret cases.
- DOM tests prove a short value stays at 19px and simulated overflow reduces the size without going below 11px.
- Preview tests prove semantic `<sup>` markup appears in the index table.
- Scaling tests cover width-limited, height-limited, landscape, resize, orientation, and the 100% maximum cases.
- Browser tests assert every scaled page is completely contained by its preview viewport at representative phone, tablet, landscape, and desktop dimensions.
- Existing A4 screenshot, legacy parity, pagination, print, typecheck, lint, and production-build gates must continue to pass. Visual baselines are updated only if the intended superscript sample changes pixels.

## Acceptance criteria

- No experiment-name text crosses a horizontal row boundary in preview or PDF output.
- Font size changes only when a name would overflow, with an 11px lower bound.
- Ten rows remain on every A4 index page.
- `y^2` and similar caret exponents display as superscripts.
- Editing, persistence, import, and export preserve the original caret notation.
- A single A4 preview page is fully visible without internal clipping at supported viewport sizes.
- Short landscape screens give the preview the full available width before shrinking it.
- Multi-page previews scroll only between complete scaled pages.
