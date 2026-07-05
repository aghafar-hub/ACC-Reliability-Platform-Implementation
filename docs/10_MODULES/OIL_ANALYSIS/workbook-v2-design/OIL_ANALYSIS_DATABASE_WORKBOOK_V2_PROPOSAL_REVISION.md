# Oil Analysis Database Workbook V2 — Proposal Revision

Supersedes the tracker/viewer sections of `OIL_ANALYSIS_DATABASE_WORKBOOK_V2_PROPOSAL.md` after rejection. All other sections of the original proposal stand.

## Why the original draft was rejected
- `Oil Sample Tracker 1` (874-row equipment matrix, full Jul-22→date history) and `Oil Sample Tracker` (1231-row equivalent) were replaced by narrow, LP_ID-keyed app-style tables (`Oil_Sample_Tracker`: 8 cols/4 months; `Oil_Sample_Timeline`: 6 cols) — losing the wide historical matrix and re-keying rows from Equipment to LP_ID.
- This was a redesign of existing engineering tabs, not an enhancement.

## Corrected approach
1. **Preserve, don't rebuild.** `Oil Sample Tracker 1`, `Oil Sample Tracker`, `Data_Entry`, `Equipment Registry`, `📊Analysis Reports`, `Sheet1` (dashboard), `Analysis Report`, `Data Entry_BD` are carried over from V1 **unchanged** — same sheet names, row/column layout, cell content, hidden/visible state.
2. **Viewer-only by default, not permanently locked.** `Action Tracker` and `Oil Change Log` keep their exact V1 layout; sheet protection is the *default* state, not permanent — this workbook is the emergency fallback if the application is unavailable, so protection must be configurable and unlockable by the App Owner during emergency mode. `Action Tracker` shows Oil Analysis actions only; `Oil Change Log` shows condition-based history from Oil Lubrication only — normally synchronized read targets, never master records, but editable when unlocked in emergency mode.
3. **Additive-only new sheets.** OCR and system-architecture sheets are appended around the existing workbook, not merged into it: `README`, `LP_Register`, `OCR_Import_Queue` (hidden), `OCR_Review`, `LP_Mapping_Memory` (hidden), `PDF_Archive` (hidden), `Import_Audit_Log` (hidden), `_Config_Validation` (hidden), `_Sync_Metadata` (hidden).
4. **Data_Entry stays sole production table.** OCR path is `OCR_Import_Queue` → `OCR_Review` (engineer approval) → `Data_Entry`. OCR never writes directly to `Data_Entry`.
5. **Dropped from this revision:** `Oil_Sample_Tracker` / `Oil_Sample_Timeline` / `Dashboard` / `Analysis_Reports` replacement sheets and the LP_ID row re-keying of trackers. May be reconsidered later as a genuinely additive analytics layer, never as a replacement of the existing tracker tabs.

## V1 → V2 Revision Sheet Mapping
| V1 Sheet | V2 Revision | Change |
|---|---|---|
| Sheet1, Analysis Report, Oil Sample Tracker 1, Oil Sample Tracker, Oil Change Log, Data Entry_BD, Data_Entry, 📊Analysis Reports, Action Tracker, Equipment Registry | same name, unchanged | none — carried over verbatim |
| Action Tracker | same | + sheet protection (viewer-only), layout untouched |
| Oil Change Log | same | + sheet protection (viewer-only), layout untouched |
| *(none)* | README, LP_Register, OCR_Import_Queue, OCR_Review, LP_Mapping_Memory, PDF_Archive, Import_Audit_Log, _Config_Validation, _Sync_Metadata | new, additive only |

See `WORKBOOK_CHANGE_LOG_REVISION.md` for the itemized diff against the rejected draft.

## Recommendation: configurable protection (emergency fallback)
`Action Tracker` and `Oil Change Log` protection must not be permanent. This workbook is the emergency fallback when the app is unavailable, so the App Owner needs to unlock these sheets for direct editing during emergency mode, then re-lock to resume viewer/synchronized behavior. Implementation options to evaluate at build time: password-protected sheet protection (App Owner holds password), or an Apps Script toggle bound to an App Owner role check. Default state remains protected/viewer.

## Fidelity requirement
Carried-over V1 sheets must preserve formulas, conditional formatting, data validation, merged cells, column widths, row heights, freeze panes, tab colors, hidden state, and print areas exactly. Verified for this revision: 8 of 10 sheets are byte-identical to V1; the two protected sheets (`Action Tracker`, `Oil Change Log`) differ only by the inserted `sheetProtection` element, in schema-correct position, with all formatting/validation/merge/print elements intact.
