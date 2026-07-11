# Presets Design

## Goal

Add a dedicated presets page where users can choose code-backed JSON presets, open one as a new editable draft, then save through the existing document flow.

## Scope

- Add `/presets` as a browse page.
- Store presets in the repo, not the database.
- Support both `cover_page` and `index_sheet` preset data shapes.
- Add the first preset: an ISTT cover page extracted from `Refrence/index.html`.
- Include the reference file's ISTT logo data URL in the first preset.
- Applying a preset opens the matching existing editor as an unsaved new document.

## Architecture

Create a small preset registry in `src/features/presets/`. The registry exports typed preset summaries and a lookup by slug. The `/presets` route renders cards from that registry. The existing `/cover-page/new` and `/index-sheet/new` routes read an optional `preset` search parameter and use the preset data instead of blank defaults when the preset type matches.

## Data Flow

1. User opens `/presets`.
2. User clicks `Use preset`.
3. App navigates to `/cover-page/new?preset=istt-cover-page` or `/index-sheet/new?preset=...`.
4. New-document route resolves the preset by slug.
5. Editor receives preset data as `initialData`.
6. User edits and saves normally.

## Error Handling

- Unknown preset slug falls back to blank new-document data.
- Type mismatch falls back to blank data for that editor.
- Preset data uses the existing document schemas and save paths, so invalid data should be caught by current validation and tests.

## Testing

- Unit test the preset resolver: valid slug returns data, missing slug returns null, wrong type is ignored by route helper.
- Route/page test can stay minimal; the key behavior is the data resolver because the editors already have save/import/export coverage.

## Deferred

- No UI for users to create or upload presets.
- No database table for presets.
- No immediate save on preset click.
