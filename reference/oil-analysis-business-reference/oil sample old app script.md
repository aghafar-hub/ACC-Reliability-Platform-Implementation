// ════════════════════════════════════════════════════════════════════════════

// Arabian Cement Oil Analysis — Apps Script v4.0 (Performance Redesign)

// ════════════════════════════════════════════════════════════════════════════

// Deploy as Web App: Execute as Me · Who has access: Anyone

//

// BACKWARD COMPATIBLE: readAll / append / updateRow / deleteRow all still work

// exactly as before — existing app continues to function during migration.

//

// NEW ENDPOINTS (all via doGet, JSONP-capable with \&callback=fnName):

//   ?action=getDashboard                    → aggregated counts, cached 5 min

//   ?action=getEquipment\&id=XXXX            → samples+actions+oilChanges for one equipment

//   ?action=searchEquipment\&q=text          → top 20 matching Data\_Entry rows

//   ?action=getActions\&page=1\&limit=50      → paginated Action Tracker rows

//   ?action=getOilChanges\&page=1\&limit=50   → paginated Oil Change Log rows

//   ?action=getRecentSamples\&page=1\&limit=50→ paginated Data\_Entry rows (newest first)

//

// LAST MODIFIED TRACKING:

//   Each sheet gets a new trailing column "Last Modified" (ISO timestamp).

//   Stamped automatically on append/updateRow. Used for future incremental sync.

//   Column positions (1-based): Data\_Entry=37, Action Tracker=17, Oil Change Log=13

// ════════════════════════════════════════════════════════════════════════════



var LAST\_MODIFIED\_COL = {

&#x20; "Data\_Entry": 37,

&#x20; "Action Tracker": 17,

&#x20; "Oil Change Log": 13

};



var DASHBOARD\_CACHE\_KEY = "dashboard\_v4";

var DASHBOARD\_CACHE\_SECONDS = 300; // 5 minutes





// ─── Entry points ──────────────────────────────────────────────────────────



function doGet(e) {

&#x20; var callback = e.parameter.callback || "";

&#x20; var action   = e.parameter.action   || "readAll";

&#x20; var result;



&#x20; try {

&#x20;   switch (action) {

&#x20;     case "readAll":

&#x20;       result = readAll();

&#x20;       break;

&#x20;     case "getDashboard":

&#x20;       result = getDashboard();

&#x20;       break;

&#x20;     case "getEquipment":

&#x20;       result = getEquipmentData(e.parameter.id || "");

&#x20;       break;

&#x20;     case "searchEquipment":

&#x20;       result = searchEquipment(e.parameter.q || "");

&#x20;       break;

&#x20;     case "getActions":

&#x20;       result = getPaginated("Action Tracker", e.parameter.page, e.parameter.limit);

&#x20;       break;

&#x20;     case "getOilChanges":

&#x20;       result = getPaginated("Oil Change Log", e.parameter.page, e.parameter.limit);

&#x20;       break;

&#x20;     case "getRecentSamples":

&#x20;       result = getPaginated("Data\_Entry", e.parameter.page, e.parameter.limit, true); // newest first

&#x20;       break;

&#x20;     case "getChanges":

&#x20;       result = getChanges(e.parameter.since || "");

&#x20;       break;

&#x20;     case "readEquipmentRegistry":

&#x20;       result = readEquipmentRegistry();

&#x20;       break;

&#x20;     case "test":

&#x20;       result = { status:"ok", time: new Date().toISOString(), version:"4.0" };

&#x20;       break;

&#x20;     default:

&#x20;       result = { status:"ok", time: new Date().toISOString() };

&#x20;   }

&#x20; } catch (err) {

&#x20;   result = { error: err.message };

&#x20; }



&#x20; var json = JSON.stringify(result);



&#x20; if (callback) {

&#x20;   return ContentService

&#x20;     .createTextOutput(callback + "(" + json + ")")

&#x20;     .setMimeType(ContentService.MimeType.JAVASCRIPT);

&#x20; }

&#x20; return ContentService

&#x20;   .createTextOutput(json)

&#x20;   .setMimeType(ContentService.MimeType.JSON);

}



function doPost(e) {

&#x20; try {

&#x20;   var raw = "";

&#x20;   if (e \&\& e.postData \&\& e.postData.contents) {

&#x20;     raw = e.postData.contents;

&#x20;   } else {

&#x20;     return jsonOut({status: "error", message: "No post data received"});

&#x20;   }



&#x20;   var data = JSON.parse(raw);

&#x20;   var ss   = SpreadsheetApp.getActiveSpreadsheet();



&#x20;   if (data.action === "append") {

&#x20;     appendRow(ss, data.sheet, data.row, data.headers);

&#x20;     invalidateDashboardCache();

&#x20;     return jsonOut({status:"ok"});

&#x20;   }



&#x20;   if (data.action === "updateSampleTracker") {

&#x20;     var updateStatus = updateSampleTrackerMonthly(ss, data);

&#x20;     return jsonOut({status: updateStatus ? "ok" : "equipment\_not\_found"});

&#x20;   }



&#x20;   if (data.action === "updateRow") {

&#x20;     var ok1 = updateRow(ss, data.sheet, data.matchCols, data.matchValues, data.row);

&#x20;     invalidateDashboardCache();

&#x20;     return jsonOut({status: ok1 ? "ok" : "row\_not\_found"});

&#x20;   }



&#x20;   if (data.action === "deleteRow") {

&#x20;     var ok2 = deleteRow(ss, data.sheet, data.matchCols, data.matchValues);

&#x20;     invalidateDashboardCache();

&#x20;     return jsonOut({status: ok2 ? "ok" : "row\_not\_found"});

&#x20;   }



&#x20;   return jsonOut({status:"ok", message: "No valid action specified"});

&#x20; } catch(err) {

&#x20;   return jsonOut({status: "error", message: err.message});

&#x20; }

}



function jsonOut(obj) {

&#x20; return ContentService

&#x20;   .createTextOutput(JSON.stringify(obj))

&#x20;   .setMimeType(ContentService.MimeType.JSON);

}





// ─── Row-skip configuration (unchanged from v3) ─────────────────────────────



// Returns the 1-based row number where data starts for a given sheet.

function dataStartRowFor(sheetName) {

&#x20; if (sheetName === "Data\_Entry") return 6;     // rows 1-5 are title/instructions/header

&#x20; if (sheetName === "Oil Change Log") return 4; // rows 1-3 are title/subtitle/header

&#x20; if (sheetName === "Action Tracker") return 6; // rows 1-4 blank/title, row 5 = header

&#x20; return 2; // standard: row 1 = header

}





// ─── readAll (legacy, full sync — unchanged behaviour) ──────────────────────



function readAll() {

&#x20; var ss = SpreadsheetApp.getActiveSpreadsheet();

&#x20; return {

&#x20;   samples:    readSheet(ss, "Data\_Entry",         true),

&#x20;   actions:    readSheet(ss, "Action Tracker",     true),

&#x20;   oilChanges: readSheet(ss, "Oil Change Log",     true),

&#x20;   tracker:    readSheet(ss, "Oil Sample Tracker", false),

&#x20; };

}



function readSheet(ss, name, skipHeader) {

&#x20; var sheet = ss.getSheetByName(name);

&#x20; if (!sheet) return \[];

&#x20; var vals = sheet.getDataRange().getValues();

&#x20; if (vals.length === 0) return \[];



&#x20; // ── CUSTOM FIX FOR ARABIAN CEMENT DATA\_ENTRY ──

&#x20; if (name === "Data\_Entry") {

&#x20;   if (vals.length <= 5) return \[];

&#x20;   return skipHeader ? vals.slice(5) : vals.slice(4);

&#x20; }



&#x20; // ── CUSTOM FIX FOR ARABIAN CEMENT OIL CHANGE LOG ──

&#x20; if (name === "Oil Change Log") {

&#x20;   if (vals.length <= 3) return \[];

&#x20;   return vals.slice(3);

&#x20; }



&#x20; // ── CUSTOM FIX FOR ARABIAN CEMENT ACTION TRACKER ──

&#x20; if (name === "Action Tracker") {

&#x20;   if (vals.length <= 5) return \[];

&#x20;   return skipHeader ? vals.slice(5) : vals.slice(4);

&#x20; }



&#x20; // Standard behavior for all other tabs

&#x20; if (vals.length === 1 \&\& skipHeader) return \[];

&#x20; return skipHeader ? vals.slice(1) : vals;

}





// ─── PHASE 7: Dashboard — aggregated counts only, cached 5 minutes ──────────

//

// Returns: { criticalCount, warningCount, normalCount, overdueOilChanges,

//            pendingActions, totalSamples, totalEquipment, lastUpdated, fromCache }

//

// "criticalCount/warningCount/normalCount" reflect the MOST RECENT sample per

// equipment (matches the 3-tier status model used by the Dashboard UI:

// Alert=critical, Caution=warning, Normal=normal).



function getDashboard() {

&#x20; var cache = CacheService.getScriptCache();

&#x20; var cached = cache.get(DASHBOARD\_CACHE\_KEY);

&#x20; if (cached) {

&#x20;   var parsed = JSON.parse(cached);

&#x20;   parsed.fromCache = true;

&#x20;   return parsed;

&#x20; }



&#x20; var ss = SpreadsheetApp.getActiveSpreadsheet();



&#x20; // Samples — col A = equipment code, col D = sample date, col E = report status

&#x20; var sampleRows = readSheet(ss, "Data\_Entry", true);

&#x20; var latestByEquip = {}; // code -> { date, status }

&#x20; for (var i = 0; i < sampleRows.length; i++) {

&#x20;   var r = sampleRows\[i];

&#x20;   var code = r\[0];

&#x20;   if (!code) continue;

&#x20;   var dateVal = r\[3];

&#x20;   var status = r\[4];

&#x20;   var existing = latestByEquip\[code];

&#x20;   if (!existing || compareDates(dateVal, existing.date) > 0) {

&#x20;     latestByEquip\[code] = { date: dateVal, status: status };

&#x20;   }

&#x20; }

&#x20; var criticalCount = 0, warningCount = 0, normalCount = 0;

&#x20; Object.keys(latestByEquip).forEach(function(code) {

&#x20;   var st = (latestByEquip\[code].status || "").toString().trim();

&#x20;   if (st === "Alert") criticalCount++;

&#x20;   else if (st === "Caution" || st === "Warning") warningCount++;

&#x20;   else normalCount++;

&#x20; });



&#x20; // Oil Change Log — col L (index 11) = Status, count "Overdue"

&#x20; var ocRows = readSheet(ss, "Oil Change Log", true);

&#x20; var overdueOilChanges = 0;

&#x20; for (var j = 0; j < ocRows.length; j++) {

&#x20;   if ((ocRows\[j]\[11] || "").toString().trim() === "Overdue") overdueOilChanges++;

&#x20; }



&#x20; // Action Tracker — col J (index 9) = Status, count Open/In Progress/Waiting Stoppage

&#x20; var actRows = readSheet(ss, "Action Tracker", true);

&#x20; var pendingActions = 0;

&#x20; for (var k = 0; k < actRows.length; k++) {

&#x20;   var astatus = (actRows\[k]\[9] || "").toString().trim();

&#x20;   if (astatus === "Open" || astatus === "In Progress" || astatus === "Waiting Stoppage") pendingActions++;

&#x20; }



&#x20; var result = {

&#x20;   criticalCount: criticalCount,

&#x20;   warningCount: warningCount,

&#x20;   normalCount: normalCount,

&#x20;   overdueOilChanges: overdueOilChanges,

&#x20;   pendingActions: pendingActions,

&#x20;   totalSamples: sampleRows.length,

&#x20;   totalEquipment: Object.keys(latestByEquip).length,

&#x20;   lastUpdated: new Date().toISOString(),

&#x20;   fromCache: false

&#x20; };



&#x20; cache.put(DASHBOARD\_CACHE\_KEY, JSON.stringify(result), DASHBOARD\_CACHE\_SECONDS);

&#x20; return result;

}



function invalidateDashboardCache() {

&#x20; CacheService.getScriptCache().remove(DASHBOARD\_CACHE\_KEY);

}



// Compares two date-like cell values (Date objects, serial numbers, or strings).

// Returns >0 if a is later than b, 0 if equal/unknown, <0 if earlier.

function compareDates(a, b) {

&#x20; var da = toComparableDate(a);

&#x20; var db = toComparableDate(b);

&#x20; if (da === null || db === null) return 0;

&#x20; return da - db;

}

function toComparableDate(v) {

&#x20; if (v instanceof Date) return v.getTime();

&#x20; if (typeof v === "number") return v; // serial number — comparable directly

&#x20; if (typeof v === "string" \&\& v) {

&#x20;   var d = new Date(v);

&#x20;   if (!isNaN(d.getTime())) return d.getTime();

&#x20; }

&#x20; return null;

}





// ─── PHASE 4: getEquipment — single-equipment data only ─────────────────────

//

// Returns: { samples:\[...], actions:\[...], oilChanges:\[...] } filtered to the

// given equipment code (column A match on each sheet).



function getEquipmentData(equipmentId) {

&#x20; if (!equipmentId) return { samples: \[], actions: \[], oilChanges: \[] };

&#x20; var ss = SpreadsheetApp.getActiveSpreadsheet();

&#x20; var id = String(equipmentId).trim();



&#x20; var samples = readSheet(ss, "Data\_Entry", true).filter(function(r) {

&#x20;   return String(r\[0]).trim() === id;

&#x20; });

&#x20; var actions = readSheet(ss, "Action Tracker", true).filter(function(r) {

&#x20;   return String(r\[1]).trim() === id;

&#x20; });

&#x20; var oilChanges = readSheet(ss, "Oil Change Log", true).filter(function(r) {

&#x20;   return String(r\[0]).trim() === id;

&#x20; });



&#x20; return { samples: samples, actions: actions, oilChanges: oilChanges };

}





// ─── PHASE 6: searchEquipment — top 20 matches from Data\_Entry ──────────────

//

// Matches against Equipment Code (col A) or Description (col B), case-insensitive.

// Returns deduplicated equipment codes with their latest sample row.



function searchEquipment(q) {

&#x20; var ss = SpreadsheetApp.getActiveSpreadsheet();

&#x20; var rows = readSheet(ss, "Data\_Entry", true);

&#x20; var query = String(q || "").trim().toLowerCase();



&#x20; var seen = {};

&#x20; var results = \[];



&#x20; for (var i = rows.length - 1; i >= 0 \&\& results.length < 20; i--) {

&#x20;   var r = rows\[i];

&#x20;   var code = String(r\[0] || "");

&#x20;   var desc = String(r\[1] || "");

&#x20;   if (!code) continue;

&#x20;   if (query \&\& code.toLowerCase().indexOf(query) === -1 \&\& desc.toLowerCase().indexOf(query) === -1) continue;

&#x20;   if (seen\[code]) continue; // one (most recent) row per equipment

&#x20;   seen\[code] = true;

&#x20;   results.push(r);

&#x20; }



&#x20; return { results: results, count: results.length };

}





// ─── PHASE 4: Paginated reads for Actions / Oil Changes / Samples ───────────

//

// Returns: { rows:\[...], page, limit, total, totalPages }

// newestFirst=true reverses the row order (used for getRecentSamples).



function getPaginated(sheetName, pageParam, limitParam, newestFirst) {

&#x20; var ss = SpreadsheetApp.getActiveSpreadsheet();

&#x20; var rows = readSheet(ss, sheetName, true);



&#x20; if (newestFirst) rows = rows.slice().reverse();



&#x20; var page  = Math.max(1, parseInt(pageParam, 10) || 1);

&#x20; var limit = Math.max(1, Math.min(500, parseInt(limitParam, 10) || 50));

&#x20; var total = rows.length;

&#x20; var totalPages = Math.max(1, Math.ceil(total / limit));

&#x20; var start = (page - 1) \* limit;

&#x20; var pageRows = rows.slice(start, start + limit);



&#x20; return { rows: pageRows, page: page, limit: limit, total: total, totalPages: totalPages };

}





// ─── PHASE 8: getChanges — incremental sync ─────────────────────────────────

//

// Returns only rows whose "Last Modified" column is newer than `since`

// (an ISO timestamp from the client's last successful sync).

//

// { samples:\[...], actions:\[...], oilChanges:\[...], serverTime, since, fullSyncRequired }

//

// CAVEATS (documented for the client):

//  - Only ADDITIONS and EDITS are detected this way — row DELETIONS are not,

//    since a deleted row has no "Last Modified" value to compare. The client

//    should still run a Full Sync periodically to catch deletions.

//  - Rows created/edited BEFORE the "Last Modified" column was added have no

//    timestamp and are therefore never returned by getChanges — they were

//    already covered by the initial Full Sync.

//  - If `since` is missing/invalid, fullSyncRequired:true is returned and the

//    client should fall back to readAll().



function getChanges(since) {

&#x20; var serverTime = new Date().toISOString();

&#x20; var sinceDate = since ? new Date(since) : null;



&#x20; if (!sinceDate || isNaN(sinceDate.getTime())) {

&#x20;   return { samples: \[], actions: \[], oilChanges: \[], serverTime: serverTime, since: since || null, fullSyncRequired: true };

&#x20; }



&#x20; var ss = SpreadsheetApp.getActiveSpreadsheet();

&#x20; return {

&#x20;   samples:    filterChangedSince(ss, "Data\_Entry",     sinceDate),

&#x20;   actions:    filterChangedSince(ss, "Action Tracker", sinceDate),

&#x20;   oilChanges: filterChangedSince(ss, "Oil Change Log", sinceDate),

&#x20;   serverTime: serverTime,

&#x20;   since: since,

&#x20;   fullSyncRequired: false

&#x20; };

}



function filterChangedSince(ss, sheetName, sinceDate) {

&#x20; var col = LAST\_MODIFIED\_COL\[sheetName];

&#x20; if (!col) return \[]; // sheet not configured for tracking — nothing to report

&#x20; var rows = readSheet(ss, sheetName, true);

&#x20; var idx = col - 1; // 0-based index within the row array

&#x20; return rows.filter(function(r) {

&#x20;   var v = r\[idx];

&#x20;   if (!v) return false;

&#x20;   var d = (v instanceof Date) ? v : new Date(v);

&#x20;   return !isNaN(d.getTime()) \&\& d.getTime() > sinceDate.getTime();

&#x20; });

}





// ─── Row matching / update / delete (unchanged from v3) ─────────────────────



function findRowIndex(sheet, matchCols, matchValues, dataStartRow) {

&#x20; var startRow = dataStartRow || 2;

&#x20; var vals = sheet.getDataRange().getValues();

&#x20; for (var i = startRow - 1; i < vals.length; i++) {

&#x20;   var allMatch = true;

&#x20;   for (var c = 0; c < matchCols.length; c++) {

&#x20;     var cellVal = String(vals\[i]\[matchCols\[c]] || "").trim();

&#x20;     var target  = String(matchValues\[c] || "").trim();

&#x20;     if (cellVal !== target) { allMatch = false; break; }

&#x20;   }

&#x20;   if (allMatch) return i + 1; // 1-based row number

&#x20; }

&#x20; return -1;

}



function updateRow(ss, sheetName, matchCols, matchValues, newRow) {

&#x20; var sheet = ss.getSheetByName(sheetName);

&#x20; if (!sheet) return false;

&#x20; var rowIdx = findRowIndex(sheet, matchCols, matchValues, dataStartRowFor(sheetName));

&#x20; if (rowIdx === -1) return false;



&#x20; // Oil Change Log: only update Last Change (col J=10) and Next Oil Change (col K=11).

&#x20; // Never overwrite col L (Status) — it's a sheet formula.

&#x20; if (sheetName === "Oil Change Log") {

&#x20;   if (newRow\[9] !== undefined \&\& newRow\[9] !== "") sheet.getRange(rowIdx, 10).setValue(newRow\[9]);

&#x20;   if (newRow\[10] !== undefined \&\& newRow\[10] !== "") sheet.getRange(rowIdx, 11).setValue(newRow\[10]);

&#x20;   stampLastModified(sheet, sheetName, rowIdx);

&#x20;   return true;

&#x20; }



&#x20; sheet.getRange(rowIdx, 1, 1, newRow.length).setValues(\[newRow]);

&#x20; stampLastModified(sheet, sheetName, rowIdx);

&#x20; return true;

}



function deleteRow(ss, sheetName, matchCols, matchValues) {

&#x20; var sheet = ss.getSheetByName(sheetName);

&#x20; if (!sheet) return false;

&#x20; var rowIdx = findRowIndex(sheet, matchCols, matchValues, dataStartRowFor(sheetName));

&#x20; if (rowIdx === -1) return false;

&#x20; sheet.deleteRow(rowIdx);

&#x20; return true;

}



function appendRow(ss, sheetName, row, headers) {

&#x20; var sheet = ss.getSheetByName(sheetName);

&#x20; if (!sheet) {

&#x20;   sheet = ss.insertSheet(sheetName);

&#x20;   if (headers \&\& headers.length) sheet.appendRow(headers);

&#x20;   sheet.appendRow(row);

&#x20;   stampLastModified(sheet, sheetName, sheet.getLastRow());

&#x20;   return;

&#x20; }



&#x20; // Find the first truly empty row after the data-start row.

&#x20; // This avoids writing after blank gap rows in sheets like Action Tracker

&#x20; // where rows 1-5 are title/header and data starts at row 6.

&#x20; var dataStart = dataStartRowFor(sheetName);

&#x20; var lastRow = sheet.getLastRow();

&#x20; var allVals = sheet.getRange(dataStart, 1, Math.max(lastRow - dataStart + 1, 1), 1).getValues();

&#x20; var firstEmpty = dataStart;

&#x20; for (var i = 0; i < allVals.length; i++) {

&#x20;   if (allVals\[i]\[0] !== "" \&\& allVals\[i]\[0] !== null) {

&#x20;     firstEmpty = dataStart + i + 1;

&#x20;   }

&#x20; }

&#x20; // firstEmpty is now the row number directly after the last non-empty row in col A

&#x20; sheet.getRange(firstEmpty, 1, 1, row.length).setValues(\[row]);

&#x20; stampLastModified(sheet, sheetName, firstEmpty);

}



// Writes the current ISO timestamp into the "Last Modified" column for a row.

// Safe no-op if the sheet doesn't have a configured Last Modified column.

function stampLastModified(sheet, sheetName, rowIdx) {

&#x20; var col = LAST\_MODIFIED\_COL\[sheetName];

&#x20; if (!col) return;

&#x20; sheet.getRange(rowIdx, col).setValue(new Date().toISOString());

}





// ─── Oil Sample Tracker update (unchanged from v3) ──────────────────────────



function updateSampleTracker(ss, data) {

&#x20; var sheet = ss.getSheetByName("Oil Sample Tracker");

&#x20; if (!sheet) return false;



&#x20; var vals = sheet.getDataRange().getValues();

&#x20; if (vals.length < 1) return false;



&#x20; for (var i = 1; i < vals.length; i++) {

&#x20;   if (vals\[i]\[0] \&\& String(vals\[i]\[0]).trim() === String(data.equipmentCode).trim()) {

&#x20;     sheet.getRange(i + 1, 2).setValue(data.sampleDate);



&#x20;     var nextCol = 5;

&#x20;     var lastCol = sheet.getLastColumn();

&#x20;     while (nextCol <= lastCol \&\& sheet.getRange(1, nextCol).getValue() !== "") {

&#x20;       nextCol++;

&#x20;     }



&#x20;     sheet.getRange(1, nextCol).setValue(data.sampleDate);

&#x20;     sheet.getRange(i + 1, nextCol).setValue(data.status);

&#x20;     return true;

&#x20;   }

&#x20; }

&#x20; return false;

}





// ─── Equipment Registry read ──────────────────────────────────────────────────

// Reads "Equipment Registry" tab.

// Row 1 = title (skip), Row 2 = headers (skip), Row 3+ = data

// Columns: A=Code, B=Description, C=AssetID, D=AssetClass, E=Lubricant, F=Interval, G=Manufacturer, H=Model, I=Area

function readEquipmentRegistry() {

&#x20; var ss = SpreadsheetApp.getActiveSpreadsheet();

&#x20; var sheet = ss.getSheetByName("Equipment Registry");

&#x20; if (!sheet) return { error: "Sheet 'Equipment Registry' not found", equipment: \[] };



&#x20; var vals = sheet.getDataRange().getValues();

&#x20; if (vals.length <= 2) return { equipment: \[] };



&#x20; var equipment = \[];

&#x20; for (var i = 2; i < vals.length; i++) {

&#x20;   var row = vals\[i];

&#x20;   var code = String(row\[0] || "").trim();

&#x20;   if (!code) continue;

&#x20;   equipment.push({

&#x20;     code:         code,

&#x20;     description:  String(row\[1] || "").trim(),

&#x20;     assetId:      String(row\[2] || "").trim(),

&#x20;     assetClass:   String(row\[3] || "").trim(),

&#x20;     lubricant:    String(row\[4] || "").trim(),

&#x20;     interval:     String(row\[5] || "").trim(),

&#x20;     manufacturer: String(row\[6] || "").trim(),

&#x20;     model:        String(row\[7] || "").trim(),

&#x20;     area:         String(row\[8] || "").trim(),

&#x20;   });

&#x20; }

&#x20; return { equipment: equipment, count: equipment.length };

}



// ─── Oil Sample Tracker update (new monthly format) ──────────────────────────

// Updates "Oil Sample Tracker" sheet with new monthly column format.

// Header row: col A = "Equipment Code", col B+ = "Apr 2026", "Mar 2026" etc

// Cell value: "Normal|26 Apr 2026" (status|date) or just "Normal" (old format)

function updateSampleTrackerMonthly(ss, data) {

&#x20; var sheet = ss.getSheetByName("Oil Sample Tracker");

&#x20; if (!sheet) return false;



&#x20; var equipCode  = String(data.equipmentCode || "").trim();

&#x20; var sampleDate = data.sampleDate || "";

&#x20; var status     = data.status || "";

&#x20; if (!equipCode) return false;



&#x20; // Format month header e.g. "Apr 2026"

&#x20; var d = new Date(sampleDate);

&#x20; if (isNaN(d.getTime())) d = new Date();

&#x20; var monthHeader = d.toLocaleDateString("en-GB", { month:"short", year:"numeric" });



&#x20; // Format display date e.g. "26 Apr 2026"

&#x20; var displayDate = d.toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });

&#x20; var cellValue   = status + "|" + displayDate;



&#x20; var lastCol = sheet.getLastColumn();

&#x20; var lastRow = sheet.getLastRow();

&#x20; if (lastRow < 1) return false;



&#x20; // Find or create month column

&#x20; var headers = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()\[0] : \[];

&#x20; var monthCol = -1;

&#x20; for (var c = 1; c < headers.length; c++) {

&#x20;   if (String(headers\[c]).trim() === monthHeader) { monthCol = c + 1; break; }

&#x20; }

&#x20; if (monthCol === -1) {

&#x20;   // Add new column at end

&#x20;   monthCol = lastCol + 1;

&#x20;   sheet.getRange(1, monthCol).setValue(monthHeader);

&#x20; }



&#x20; // Find equipment row

&#x20; var colAVals = lastRow > 0 ? sheet.getRange(1, 1, lastRow, 1).getValues() : \[];

&#x20; for (var r = 0; r < colAVals.length; r++) {

&#x20;   if (String(colAVals\[r]\[0]).trim() === equipCode) {

&#x20;     sheet.getRange(r + 1, monthCol).setValue(cellValue);

&#x20;     return true;

&#x20;   }

&#x20; }

&#x20; // Equipment not found — add new row

&#x20; var newRow = lastRow + 1;

&#x20; sheet.getRange(newRow, 1).setValue(equipCode);

&#x20; sheet.getRange(newRow, monthCol).setValue(cellValue);

&#x20; return true;

}



function updateSampleTracker(ss, data) {

&#x20; var sheet = ss.getSheetByName("Oil Sample Tracker");

&#x20; if (!sheet) return false;

&#x20; 

&#x20; var vals = sheet.getDataRange().getValues();

&#x20; if (vals.length < 1) return false;



&#x20; for (var i = 1; i < vals.length; i++) {

&#x20;   // Validates row has an ID and matches the equipmentCode cleanly

&#x20;   if (vals\[i]\[0] \&\& String(vals\[i]\[0]).trim() === String(data.equipmentCode).trim()) {

&#x20;     

&#x20;     // Update primary Sample Date in Column B (index 2 / 2nd column)

&#x20;     sheet.getRange(i + 1, 2).setValue(data.sampleDate);

&#x20;     

&#x20;     // Dynamically scan headers to find the exact next empty column tracking header

&#x20;     var nextCol = 5; // Starts scanning from Column E

&#x20;     var lastCol = sheet.getLastColumn();

&#x20;     

&#x20;     while (nextCol <= lastCol \&\& sheet.getRange(1, nextCol).getValue() !== "") {

&#x20;       nextCol++;

&#x20;     }

&#x20;     

&#x20;     // Apply the tracking sampleDate header and status payload

&#x20;     sheet.getRange(1, nextCol).setValue(data.sampleDate);

&#x20;     sheet.getRange(i + 1, nextCol).setValue(data.status);

&#x20;     return true; // Match found and successfully updated

&#x20;   }

&#x20; }

&#x20; return false; // Code iterated completely but no asset match was found

}



function onEdit(e) {

&#x20; var sheet = e.source.getActiveSheet();

&#x20; var range = e.range;

&#x20; 

&#x20; // Define filter inputs

&#x20; var yearCell = "C2";

&#x20; var monthCell = "E2";

&#x20; var startRow = 6;       

&#x20; var dateColumn = 5;     // Column E (Sample Date)

&#x20; 

&#x20; // Trigger if C2 or D2 changes, OR if any cell in the data rows is edited

&#x20; if (range.getA1Notation() === yearCell || range.getA1Notation() === monthCell || range.getRow() >= startRow) {

&#x20;   

&#x20;   // Fetch values from both filters

&#x20;   var selectedYear = sheet.getRange(yearCell).getValue().toString().trim();

&#x20;   var selectedMonth = sheet.getRange(monthCell).getValue().toString().trim();

&#x20;   var lastRow = sheet.getLastRow();

&#x20;   

&#x20;   if (lastRow < startRow) return;

&#x20;   

&#x20;   // 1. Unhide everything first to start fresh

&#x20;   sheet.unhideRow(sheet.getRange(startRow, 1, lastRow - (startRow - 1)));

&#x20;   

&#x20;   // Check if filters are cleared/set to "All"

&#x20;   var allYears = (selectedYear === "" || selectedYear.toLowerCase() === "all years" || selectedYear.toLowerCase() === "all");

&#x20;   var allMonths = (selectedMonth === "" || selectedMonth.toLowerCase() === "all months" || selectedMonth.toLowerCase() === "all");

&#x20;   

&#x20;   // 2. If BOTH filters are set to show everything, stop here and leave table wide open

&#x20;   if (allYears \&\& allMonths) {

&#x20;     return;

&#x20;   }

&#x20;   

&#x20;   // 3. Grab all the actual dates from Column E

&#x20;   var dateValues = sheet.getRange(startRow, dateColumn, lastRow - (startRow - 1), 1).getValues();

&#x20;   

&#x20;   var months = \["January", "February", "March", "April", "May", "June", 

&#x20;                 "July", "August", "September", "October", "November", "December"];

&#x20;   

&#x20;   // 4. Loop and evaluate every row

&#x20;   for (var i = 0; i < dateValues.length; i++) {

&#x20;     var cellValue = dateValues\[i]\[0];

&#x20;     

&#x20;     if (cellValue instanceof Date) {

&#x20;       var rowYear = cellValue.getFullYear().toString();

&#x20;       var rowMonthName = months\[cellValue.getMonth()]; 

&#x20;       

&#x20;       // Conditions to see if a row SHOULD be hidden

&#x20;       var yearMismatch = (!allYears \&\& rowYear !== selectedYear);

&#x20;       var monthMismatch = (!allMonths \&\& rowMonthName.toLowerCase() !== selectedMonth.toLowerCase());

&#x20;       

&#x20;       // Hide the row if EITHER the year or the month doesn't match your selection

&#x20;       if (yearMismatch || monthMismatch) {

&#x20;         sheet.hideRows(startRow + i);

&#x20;       }

&#x20;     }

&#x20;     // Blank data rows are ignored here, keeping them visible at the bottom!

&#x20;   }

&#x20; }

}



