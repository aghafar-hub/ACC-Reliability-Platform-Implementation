# Apps Script — Deployment Setup

Checklist for deploying the ACC Reliability Platform master-data backend as a Google Apps Script Web App.

## Prerequisites

- Google account with access to Google Sheets and Apps Script
- [clasp](https://github.com/google/clasp) CLI (optional, for push/pull from this repo)

```bash
npm install -g @google/clasp
clasp login
```

## 1. Create the Apps Script project

**Option A — clasp (recommended)**

1. In [Google Apps Script](https://script.google.com/), create a **New project**.
2. Copy the project **Script ID** from **Project settings**.
3. From this repository:

   ```bash
   cd apps-script
   cp .clasp.json.example .clasp.json
   ```

   Edit `.clasp.json` and replace `YOUR_APPS_SCRIPT_PROJECT_ID` with your Script ID.

4. Push source files:

   ```bash
   clasp push
   ```

**Option B — manual**

1. Create a **New project** in the Apps Script editor.
2. Create one script file per `.gs` file in this folder (`Code.gs`, `config.gs`, `router.gs`, etc.).
3. Copy the contents of `appsscript.json` into **Project settings → App manifest** (or use **View → Show manifest file**).

## 2. Configure the master-data spreadsheet

### Script property

Set the spreadsheet ID via a **Script property** (not in source code):

1. Apps Script editor → **Project settings** (gear) → **Script properties**
2. Add:

   | Property | Value |
   |----------|--------|
   | `MASTER_DATA_SPREADSHEET_ID` | Your Google Spreadsheet ID |

The ID is the long string in the spreadsheet URL:

`https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`

Do **not** commit real spreadsheet IDs to the repository.

### Required sheets

Create a spreadsheet with these tabs (names must match exactly):

| Sheet name | Purpose |
|------------|---------|
| `Equipment_Master` | Equipment master records |
| `LP_Master` | Lubrication point master records |

### Required headers (row 1)

**Equipment_Master**

```
equipmentId | name | area | contractorId | status | createdAt | updatedAt
```

**LP_Master**

```
lpId | equipmentId | name | lubricant | frequencyDays | oaRequired | samplingIntervalDays | status | area | contractorId | createdAt | updatedAt
```

- Header names are case-sensitive and must match `config.gs`.
- `oaRequired` accepts `TRUE` / `FALSE`, `true` / `false`, `1` / `0`, or `yes` / `no`.
- Date fields (`createdAt`, `updatedAt`) are stored as ISO 8601 strings.

### Spreadsheet access

The Google account that **deploys** the Web App must have **edit** access to the spreadsheet (see execute-as setting below).

## 3. Deploy as Web App

1. Apps Script editor → **Deploy** → **New deployment**
2. Type: **Web app**
3. Settings:

   | Setting | Recommended value | Notes |
   |---------|-------------------|--------|
   | **Execute as** | Me (`USER_DEPLOYING`) | Script runs with the deployer’s Sheets access |
   | **Who has access** | Anyone | Required for browser `fetch` from Owner Center without Google sign-in per request |

   For internal-only pilots, **Anyone with Google account** is stricter but requires users to be signed into Google.

4. Click **Deploy** and authorize the app when prompted (Sheets scope).
5. Copy the **Web app URL** (ends with `/exec`).

After code changes, create a **New deployment** or **Manage deployments → Edit → Version: New version** so the `/exec` URL serves the latest code.

## 4. Connect Owner Center (Vite env vars)

Copy the Web App URL into local env for development or test only. Production builds should leave these unset so **localStorage** remains the default.

Create or edit `apps/owner-center/.env.local`:

```env
VITE_ACC_API_MODE=appsScript
VITE_ACC_APPS_SCRIPT_BASE_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
VITE_ACC_MASTER_DATA_PROVIDER=googleSheets
```

| Variable | Purpose |
|----------|---------|
| `VITE_ACC_API_MODE` | `appsScript` switches API client mode |
| `VITE_ACC_APPS_SCRIPT_BASE_URL` | Deployed Web App `/exec` URL (no trailing path) |
| `VITE_ACC_MASTER_DATA_PROVIDER` | `googleSheets` routes equipment/LP repositories through Apps Script |

See `apps/owner-center/.env.example` for placeholders.

Restart the Vite dev server after changing env vars.

## 5. Smoke-test endpoints

Use these after deployment and spreadsheet setup. Replace `BASE_URL` with your Web App URL.

### `equipment.list`

**GET**

```http
GET BASE_URL?action=equipment.list
```

Optional query params: `status`, `contractorId`, `area`, `searchText`, `offset`, `limit`.

**POST**

```json
POST BASE_URL
Content-Type: application/json

{
  "action": "equipment.list",
  "limit": 10,
  "offset": 0
}
```

**Success shape**

```json
{
  "ok": true,
  "data": {
    "equipment": [],
    "total": 0,
    "offset": 0,
    "limit": 10
  }
}
```

### `lp.list`

**GET**

```http
GET BASE_URL?action=lp.list
```

Optional query params: `status`, `contractorId`, `area`, `equipmentId`, `searchText`, `offset`, `limit`.

**POST**

```json
POST BASE_URL
Content-Type: application/json

{
  "action": "lp.list",
  "equipmentId": "EQ-001"
}
```

**Success shape**

```json
{
  "ok": true,
  "data": {
    "lubricationPoints": [],
    "total": 0,
    "offset": 0,
    "limit": 0
  }
}
```

### Common errors

| Code | Cause |
|------|--------|
| `MISSING_SPREADSHEET_ID` | `MASTER_DATA_SPREADSHEET_ID` not set or still placeholder |
| `SHEET_NOT_FOUND` | Missing `Equipment_Master` or `LP_Master` tab |
| `MISSING_ACTION` | No `action` query param or JSON field |
| `UNKNOWN_ACTION` | Unsupported action name |

All responses use `{ ok, data }` or `{ ok: false, error: { code, message, details? } }`.

## 6. Deployment checklist

- [ ] Apps Script project created; `.gs` files and `appsscript.json` deployed
- [ ] `MASTER_DATA_SPREADSHEET_ID` script property set
- [ ] Spreadsheet has `Equipment_Master` and `LP_Master` with correct headers
- [ ] Web App deployed; `/exec` URL copied
- [ ] `equipment.list` returns `{ ok: true, ... }` (empty list is OK)
- [ ] `lp.list` returns `{ ok: true, ... }` (empty list is OK)
- [ ] Owner Center `.env.local` updated (dev/test only); dev server restarted

## File layout (clasp)

```
apps-script/
  appsscript.json      # Project manifest (V8, webapp defaults)
  .clasp.json.example  # Copy to .clasp.json locally (not committed)
  Code.gs              # doGet / doPost entry points
  config.gs            # Spreadsheet ID property + column definitions
  router.gs            # Action routing
  request.gs / response.gs / errors.gs
  sheets.gs            # Sheet read/write helpers
  equipment-handlers.gs
  lp-handlers.gs
```
