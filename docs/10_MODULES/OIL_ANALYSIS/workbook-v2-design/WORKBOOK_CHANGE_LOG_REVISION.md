# Workbook Change Log — V2 Draft Revision

Base: `reference/oil-analysis-business-reference/ACC OIL Analysis Report - V1.xlsx` (production/reference workbook — not modified).
Output: `ACC_OIL_ANALYSIS_DATABASE_V2_DRAFT_REVISION.xlsx` (draft only).

## Reverted (restored to V1 as-is)
- `Oil Sample Tracker 1` — full equipment × month matrix (158 populated rows, dates to row 874) restored verbatim; no LP_ID re-keying, no month-window truncation.
- `Oil Sample Tracker` — full matrix (to row 1231) restored verbatim.
- `Data_Entry`, `Data Entry_BD`, `Equipment Registry`, `📊Analysis Reports`, `Sheet1`, `Analysis Report` — restored verbatim, including hidden/visible state.

## Changed (minimal, non-visual)
- `Action Tracker` — added `sheetProtection` flag only (viewer-only enforcement). No cell, column, or row changes.
- `Oil Change Log` — added `sheetProtection` flag only (viewer-only enforcement). No cell, column, or row changes.

## Removed from prior draft
- `Oil_Sample_Tracker` (LP_ID rows, 4-month window) — dropped.
- `Oil_Sample_Timeline` (interval-compliance replacement) — dropped.
- `Dashboard`, `Analysis_Reports` (new formula-engine replacements) — dropped; V1's `Sheet1` and `📊Analysis Reports` stand in their place.

## Added (additive only, new sheets)
- `README` — revision notes and pointers to this change log / proposal revision.
- `LP_Register` — new master lubrication-point register (header only, design stage).
- `OCR_Import_Queue` (hidden) — OCR staging queue.
- `OCR_Review` — engineer approval screen; promotes to `Data_Entry` only on explicit decision.
- `LP_Mapping_Memory` (hidden), `PDF_Archive` (hidden), `Import_Audit_Log` (hidden) — OCR support/audit sheets.
- `_Config_Validation` (hidden), `_Sync_Metadata` (hidden) — governance/config sheets, encode the "Data_Entry sole production table" and "OCR never writes directly to Data_Entry" rules as recorded checks.

## Verification performed
- Confirmed all 10 original V1 sheets present with identical names, visibility state, and row content after rebuild.
- Confirmed zip entry paths use forward slashes (OOXML-compliant) after rebuild.
- Confirmed `sheetProtection` present only on `Action Tracker` and `Oil Change Log`, with `</sheetData>` content unchanged.
