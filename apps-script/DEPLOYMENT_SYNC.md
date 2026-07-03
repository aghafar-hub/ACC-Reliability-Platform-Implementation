# Apps Script Deployment Sync

**Cursor (this repo) is the single source of truth** for all Apps Script source code.
Do not edit `.gs` files in the online Apps Script editor — changes made there will be overwritten on the next `clasp push` and can drift from the repo.

## Workflow

```
Edit in Cursor  →  clasp push  →  Apps Script project updated
```

1. Make changes under `apps-script/` in this repository.
2. From `apps-script/`, run `clasp push`.
3. In the Apps Script editor, create a **New deployment** (or bump version on the existing Web App) so `/exec` serves the latest code.

## One-time setup

```bash
npm install -g @google/clasp
clasp login
cd apps-script
cp .clasp.json.example .clasp.json
```

Edit `.clasp.json` and set `scriptId` to your Apps Script project ID (Project settings → Script ID).

```bash
clasp push
```

`.clasp.json` is local only and must not be committed.

## Deployable files

`clasp push` uploads only canonical `.gs` sources and `appsscript.json`. Excluded via `.claspignore`:

| Excluded | Reason |
|----------|--------|
| `db-initializer.gs` | Obsolete duplicate — use `database/initializeAccDatabase.gs` |
| `*.md` | Documentation only |
| `.clasp.json.example` | Local template |

### Canonical file layout

```
apps-script/
  appsscript.json
  Code.gs                    # doGet / doPost
  config.gs                  # Master-data API config
  workbook-config.gs         # Workbook IDs + verification helpers
  router.gs
  request.gs / response.gs / errors.gs
  sheets.gs
  equipment-handlers.gs
  lp-handlers.gs
  database/initializeAccDatabase.gs
  migration/previewMasterDataMigration.gs
```

## Script Properties (required for production)

Set in Apps Script → **Project settings** → **Script properties**. Never commit real IDs to the repo.

| Property | Workbook |
|----------|----------|
| `SETTINGS_CONFIG_SPREADSHEET_ID` | ACC_PLATFORM_SETTINGS_CONFIG |
| `MASTER_DATA_SPREADSHEET_ID` | ACC_PLATFORM_MASTER_DATA |
| `OIL_LUBRICATION_SPREADSHEET_ID` | ACC_OIL_LUBRICATION_DATA |
| `OIL_ANALYSIS_SPREADSHEET_ID` | ACC_OIL_ANALYSIS_DATA |

`WORKBOOK_IDS` placeholders in `initializeAccDatabase.gs` are **fallback only** for local/bootstrap use when Script Properties are not set.

## Config verification (run in Apps Script editor)

After setting Script Properties and before running initializers or migration preview:

```javascript
showConfiguredWorkbookIds();      // resolved IDs + source (property vs fallback)
verifyActiveWorkbookNames();      // each ID opens the expected workbook name
detectDuplicateWorkbookNames();   // flags two IDs sharing the same name
```

Resolve any `FAIL` or `DUPLICATES FOUND` result before running `initializeAccDatabase()` or `previewMasterDataMigration()`.

## Safety guards

- `initMasterDataOnly()` logs the exact master workbook **name and ID** before creating sheets.
- `previewMasterDataMigration()` logs the `MASTER_DATA_SPREADSHEET_ID` workbook **name and ID** before reading lookup sheets.

Neither guard modifies production sheet data.

## Related docs

- `SETUP.md` — Web App deployment and Owner Center env vars
- `database/MANUAL_FALLBACK_GUIDE.md` — manual sheet operations
