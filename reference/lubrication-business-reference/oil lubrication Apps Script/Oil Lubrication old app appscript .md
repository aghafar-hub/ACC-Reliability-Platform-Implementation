/\*\*

&#x20;\* ACC Oil Lubrication System

&#x20;\* File Version: 4.1.0

&#x20;\* Phase: P04

&#x20;\* Patch: P04.1

&#x20;\* Last Modified: 2026-06-24

&#x20;\* Modified By: Cursor

&#x20;\* Purpose: P03.8 recurring route engine — frequency-driven generation \& due notifications

&#x20;\*

&#x20;\* ============================================================================

&#x20;\* ACC Oil Lubrication System — Google Apps Script Backend

&#x20;\* ============================================================================

&#x20;\*

&#x20;\* Replaces the Node/Express + Prisma backend entirely. The React/Vite

&#x20;\* frontend talks directly to this Web App over HTTPS; this script reads and

&#x20;\* writes the two existing Google Sheets workbooks (Operational Data, Users \&

&#x20;\* Config) as the application's database. No Node server, no Postgres/SQLite,

&#x20;\* no Firebase/Supabase.

&#x20;\*

&#x20;\* ARCHITECTURE

&#x20;\*   Instead of mimicking REST paths, the frontend calls one Web App URL with

&#x20;\*   a function name ("fn") + parameters. doGet/doPost route to the matching

&#x20;\*   handler below. This keeps the whole backend in a single addressable

&#x20;\*   file, which is the natural shape for Apps Script (no router framework

&#x20;\*   available) and avoids the CORS preflight problems that a path-based

&#x20;\*   REST-over-Apps-Script design runs into (see DEPLOYMENT\_GUIDE.md).

&#x20;\*

&#x20;\* DATA MODEL

&#x20;\*   This script does NOT redesign the spreadsheet. It reads the tabs exactly

&#x20;\*   as they already exist in ACC\_Oil\_Operational\_Data.xlsx and

&#x20;\*   ACC\_Oil\_Users\_Config.xlsx (902 existing lubrication points, 1,102

&#x20;\*   existing history rows — never touched on read, only appended to or

&#x20;\*   patched by id on write). The only schema change this script requires is

&#x20;\*   two ADDITIONAL columns on the existing "Users" tab — "Password Hash" and

&#x20;\*   "Password Salt" — needed because the previous architecture kept

&#x20;\*   passwords in Postgres, outside the spreadsheet. See

&#x20;\*   DEPLOYMENT\_GUIDE.md "Manual setup" for the one-time step this requires.

&#x20;\*

&#x20;\* SETUP — see DEPLOYMENT\_GUIDE.md for the full walkthrough. Summary:

&#x20;\*   1. Script Properties (Project Settings -> Script Properties):

&#x20;\*        OPERATIONAL\_SHEET\_ID = 1PvWrm5Sf1w3o3yIil\_YWiwwQNrUDH\_JRNB\_gJqZsYFY

&#x20;\*        CONFIG\_SHEET\_ID      = 1r9ZOBsy5Ml\_rGZe8vvneDv4VyLm90S8eDERWze80MzY

&#x20;\*        TOKEN\_SECRET         = <any long random string — signs session tokens>

&#x20;\*   2. Run `bootstrapAddPasswordColumns` once from the Apps Script editor

&#x20;\*      (adds the two new columns to Users if they don't already exist).

&#x20;\*   3. Run `adminSetPassword\_("email@x.com", "TempPass123!")` once per user

&#x20;\*      (or use the "ACC Oil Admin" menu added to the bound Sheet's UI) to

&#x20;\*      give every existing account an initial password.

&#x20;\*   4. Deploy -> New deployment -> Web app -> Execute as "Me", Access

&#x20;\*      "Anyone". Copy the /exec URL into the frontend's VITE\_APPS\_SCRIPT\_URL.

&#x20;\*

&#x20;\* ============================================================================

&#x20;\*/



// ─────────────────────────────────────────────────────────────────────────

// CONFIG

// ─────────────────────────────────────────────────────────────────────────



var PROPS = PropertiesService.getScriptProperties();



var BOOK = { OPERATIONAL: 'operational', CONFIG: 'config' };



var SHEETS = {

&#x20; LUBRICATION\_POINTS: 'Lubrication Points',

&#x20; LUBRICATION\_HISTORY: 'Lubrication History',

&#x20; OIL\_SAMPLES: 'Oil Samples',

&#x20; OIL\_SAMPLE\_PARAMETERS: 'Oil Sample Parameters',

&#x20; ACTION\_PLANS: 'Action Plans',

&#x20; ROUTES: 'Routes',

&#x20; ROUTE\_ASSIGNMENTS: 'Route Assignments',

&#x20; ROUTE\_EXECUTION\_LOG: 'Route Execution Log',

&#x20; NOTIFICATIONS: 'Notifications',

&#x20; AUDIT\_LOG: 'Audit Log',

&#x20; OIL\_PURCHASE\_LOG: 'Oil Purchase Log',

&#x20; USERS: 'Users',

&#x20; TITLES: 'Titles',

&#x20; PERMISSION\_TEMPLATES: 'Permission Templates',

&#x20; ORGANIZATIONS: 'Organizations',

&#x20; EQUIPMENT: 'Equipment',

&#x20; AREAS: 'Areas',

&#x20; LUBRICANT\_TYPES: 'Lubricant Types',

&#x20; ACTION\_TYPES: 'Action Types',

&#x20; NOTIFICATION\_TYPES: 'Notification Types \& Routing',

&#x20; GENERAL\_SETTINGS: 'General Settings'

};



// Token lifetime. Mirrors the old JWT\_EXPIRES\_IN / JWT\_MOBILE\_EXPIRES\_IN split.

var TOKEN\_TTL\_MS = 8 \* 60 \* 60 \* 1000;        // 8 hours, desktop

var TOKEN\_TTL\_MOBILE\_MS = 30 \* 24 \* 60 \* 60 \* 1000; // 30 days, mobile



// ─────────────────────────────────────────────────────────────────────────

// WEB APP ENTRY POINTS

// ─────────────────────────────────────────────────────────────────────────



function doGet(e) {

&#x20; return handleRequest\_(e, false);

}



function doPost(e) {

&#x20; return handleRequest\_(e, true);

}



/\*\*

&#x20;\* Single entry point for both verbs. The frontend always sends:

&#x20;\*   GET  ...?fn=getDashboardData\&token=...\&p=<url-encoded JSON params>

&#x20;\*   POST body: { "fn": "...", "token": "...", "params": {...} }

&#x20;\* (POST bodies are sent as text/plain, not application/json, specifically

&#x20;\* to avoid a CORS preflight — see DEPLOYMENT\_GUIDE.md "Why fn-routing".)

&#x20;\*/

function handleRequest\_(e, isPost) {

&#x20; \_\_requestLpIndex = null;

&#x20; var fn, token, params;

&#x20; try {

&#x20;   if (isPost) {

&#x20;     var body = JSON.parse((e.postData \&\& e.postData.contents) || '{}');

&#x20;     fn = body.fn;

&#x20;     token = body.token;

&#x20;     params = body.params || {};

&#x20;   } else {

&#x20;     var q = (e \&\& e.parameter) || {};

&#x20;     fn = q.fn;

&#x20;     token = q.token;

&#x20;     params = q.p ? JSON.parse(q.p) : {};

&#x20;   }



&#x20;   var entry = FUNCTION\_MAP\[fn];

&#x20;   if (!entry) return jsonOut\_({ ok: false, error: 'Unknown function: ' + fn });



&#x20;   var user = null;

&#x20;   if (entry.auth !== false) {

&#x20;     user = requireAuth\_(token);

&#x20;     if (entry.screen) requireScreen\_(user, entry.screen);

&#x20;     if (entry.capability) requireCapability\_(user, entry.capability);

&#x20;   }



&#x20;   var result = entry.handler(params || {}, user);

&#x20;   return jsonOut\_({ ok: true, data: result });

&#x20; } catch (err) {

&#x20;   var status = err \&\& err.httpStatus ? err.httpStatus : 500;

&#x20;   return jsonOut\_({ ok: false, error: (err \&\& err.message) || String(err), status: status });

&#x20; }

}



function jsonOut\_(obj) {

&#x20; return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);

}



/\*\* Throws a tagged error so the client can distinguish 401/403/404/400 from generic 500s. \*/

function apiError\_(status, message) {

&#x20; var e = new Error(message);

&#x20; e.httpStatus = status;

&#x20; return e;

}



// ─────────────────────────────────────────────────────────────────────────

// SHEET I/O — generic table read/write helpers

// ─────────────────────────────────────────────────────────────────────────



function getSpreadsheetId\_(book) {

&#x20; if (book === BOOK.OPERATIONAL) return PROPS.getProperty('OPERATIONAL\_SHEET\_ID');

&#x20; if (book === BOOK.CONFIG) return PROPS.getProperty('CONFIG\_SHEET\_ID');

&#x20; throw new Error("Unknown book: " + book);

}



function getSpreadsheet\_(book) {

&#x20; var id = getSpreadsheetId\_(book);

&#x20; if (!id) throw new Error('Script property missing for book "' + book + '". Set OPERATIONAL\_SHEET\_ID / CONFIG\_SHEET\_ID in Script Properties.');

&#x20; return SpreadsheetApp.openById(id);

}



function getSheet\_(book, sheetName) {

&#x20; var ss = getSpreadsheet\_(book);

&#x20; var sheet = ss.getSheetByName(sheetName);

&#x20; if (!sheet) throw new Error('Sheet not found: "' + sheetName + '" in ' + book + ' workbook.');

&#x20; return sheet;

}



// Workbooks put a single-cell note in A1 (blank row 2, real header row 3) on

// tabs that carry an explanatory note, and a plain header in row 1 on tabs

// that don't. Detect which pattern this sheet uses — same convention as the

// original starting-point Code.gs.

function findHeaderRow\_(sheet) {

&#x20; if (sheet.getLastColumn() === 0) return 1;

&#x20; var row1 = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()\[0];

&#x20; var row1Populated = row1.filter(function (v) { return v !== '' \&\& v !== null; }).length;

&#x20; return row1Populated > 1 ? 1 : 3;

}



/\*\* Reads a whole tab into { headers, headerRow, rows: \[{col: val, ..., \_\_row}] }. \*/

function readTable\_(sheet) {

&#x20; var headerRow = findHeaderRow\_(sheet);

&#x20; var lastRow = sheet.getLastRow();

&#x20; var lastCol = sheet.getLastColumn();

&#x20; var headers = lastCol > 0 ? sheet.getRange(headerRow, 1, 1, lastCol).getValues()\[0] : \[];

&#x20; var rows = \[];

&#x20; if (lastRow > headerRow) {

&#x20;   var data = sheet.getRange(headerRow + 1, 1, lastRow - headerRow, lastCol).getValues();

&#x20;   for (var i = 0; i < data.length; i++) {

&#x20;     var r = data\[i];

&#x20;     var obj = {};

&#x20;     for (var c = 0; c < headers.length; c++) {

&#x20;       if (headers\[c]) obj\[headers\[c]] = r\[c];

&#x20;     }

&#x20;     obj.\_\_row = headerRow + 1 + i;

&#x20;     // Skip fully-blank rows (trailing blank rows some sheets carry).

&#x20;     var hasValue = false;

&#x20;     for (var k = 0; k < headers.length; k++) {

&#x20;       var hv = obj\[headers\[k]];

&#x20;       if (hv !== '' \&\& hv !== null \&\& hv !== undefined) { hasValue = true; break; }

&#x20;     }

&#x20;     if (hasValue) rows.push(obj);

&#x20;   }

&#x20; }

&#x20; return { headers: headers, headerRow: headerRow, rows: rows };

}



/\*\* Shorthand: book+sheet -> rows array (most callers only need this). \*/

function readRows\_(book, sheetName) {

&#x20; return readTable\_(getSheet\_(book, sheetName)).rows;

}



function appendRowObj\_(book, sheetName, rowObj) {

&#x20; var sheet = getSheet\_(book, sheetName);

&#x20; var table = readTable\_(sheet);

&#x20; var newRow = table.headers.map(function (h) {

&#x20;   if (!h) return '';

&#x20;   var v = rowObj\[h];

&#x20;   return v === undefined || v === null ? '' : v;

&#x20; });

&#x20; sheet.appendRow(newRow);

&#x20; SpreadsheetApp.flush();

&#x20; return rowObj;

}



/\*\* Updates the first row where keyColumn === keyValue. Returns the updated row's \_\_row, or null. \*/

function updateRowByKey\_(book, sheetName, keyColumn, keyValue, updates) {

&#x20; var sheet = getSheet\_(book, sheetName);

&#x20; var table = readTable\_(sheet);

&#x20; var match = null;

&#x20; for (var i = 0; i < table.rows.length; i++) {

&#x20;   if (String(table.rows\[i]\[keyColumn]) === String(keyValue)) { match = table.rows\[i]; break; }

&#x20; }

&#x20; if (!match) return null;

&#x20; Object.keys(updates).forEach(function (field) {

&#x20;   var colIdx = table.headers.indexOf(field);

&#x20;   if (colIdx === -1) return;

&#x20;   sheet.getRange(match.\_\_row, colIdx + 1).setValue(updates\[field]);

&#x20; });

&#x20; SpreadsheetApp.flush();

&#x20; return match.\_\_row;

}



/\*\* Generates the next sequential id for a prefix, e.g. nextSequentialId\_('operational','Action Plans','Action ID','ACT-',5) -> "ACT-00042". \*/

function nextSequentialId\_(book, sheetName, idColumn, prefix, padLength) {

&#x20; var rows = readRows\_(book, sheetName);

&#x20; var max = 0;

&#x20; rows.forEach(function (r) {

&#x20;   var v = String(r\[idColumn] || '');

&#x20;   if (v.indexOf(prefix) === 0) {

&#x20;     var n = parseInt(v.slice(prefix.length), 10);

&#x20;     if (!isNaN(n) \&\& n > max) max = n;

&#x20;   }

&#x20; });

&#x20; var next = max + 1;

&#x20; var s = String(next);

&#x20; while (s.length < padLength) s = '0' + s;

&#x20; return prefix + s;

}



/\*\*

&#x20;\* Runs fn() while holding a script-wide lock. Apps Script Web App requests

&#x20;\* from different users can execute concurrently — without this, two

&#x20;\* technicians submitting at the same moment could both read the same "max

&#x20;\* existing id" and append rows with the SAME generated id (e.g. two

&#x20;\* different Lubrication History rows both as "REC-01103"), which would

&#x20;\* silently corrupt lookups, approvals, and audit trails that key off that

&#x20;\* id. Every call site that does nextSequentialId\_() immediately followed

&#x20;\* by appendRowObj\_() wraps both inside this lock so the read-then-append

&#x20;\* is atomic. Waits up to 30s for the lock before giving up (returns a

&#x20;\* clear error rather than hanging silently).

&#x20;\*/

function withScriptLock\_(fn) {

&#x20; var lock = LockService.getScriptLock();

&#x20; var got = lock.tryLock(30000);

&#x20; if (!got) throw apiError\_(503, 'The system is busy — please try again in a few seconds.');

&#x20; try {

&#x20;   return fn();

&#x20; } finally {

&#x20;   lock.releaseLock();

&#x20; }

}



// ── P03.6: Script cache helpers (TTL + invalidation) ───────────────────────

var SCRIPT\_CACHE\_TTL\_SEC = 120;

var \_\_requestLpIndex = null;



function scriptCacheGet\_(key) {

&#x20; try {

&#x20;   var raw = CacheService.getScriptCache().get(key);

&#x20;   if (!raw) return null;

&#x20;   return JSON.parse(raw);

&#x20; } catch (e) {

&#x20;   return null;

&#x20; }

}



function scriptCachePut\_(key, value, ttlSec) {

&#x20; try {

&#x20;   var json = JSON.stringify(value);

&#x20;   if (json.length > 95000) return;

&#x20;   CacheService.getScriptCache().put(key, json, ttlSec || SCRIPT\_CACHE\_TTL\_SEC);

&#x20; } catch (e) { /\* quota or size — skip \*/ }

}



function bumpDataCacheVersion\_() {

&#x20; PROPS.setProperty('DATA\_CACHE\_VERSION', String(Date.now()));

}



function invalidateOperationalCaches\_() {

&#x20; bumpDataCacheVersion\_();

&#x20; \_\_requestLpIndex = null;

}



function toIso\_(v) {

&#x20; if (v === null || v === undefined || v === '') return null;

&#x20; if (v instanceof Date) return v.toISOString();

&#x20; if (typeof v === 'string') {

&#x20;   var d = new Date(v);

&#x20;   return isNaN(d.getTime()) ? v : d.toISOString();

&#x20; }

&#x20; return v;

}



function toDateOrNull\_(v) {

&#x20; if (v === null || v === undefined || v === '') return null;

&#x20; if (v instanceof Date) return v;

&#x20; var d = new Date(v);

&#x20; return isNaN(d.getTime()) ? null : d;

}



function boolFromYesNo\_(v) {

&#x20; if (typeof v === 'boolean') return v;

&#x20; var s = String(v || '').trim().toLowerCase();

&#x20; return s === 'yes' || s === 'true' || s === '1';

}



function yesNo\_(b) { return b ? 'Yes' : 'No'; }



// ─────────────────────────────────────────────────────────────────────────

// AUTH \& SECURITY

// ─────────────────────────────────────────────────────────────────────────



/\*\* Constant-time string comparison — mitigates timing side-channel attacks

&#x20;\* on signature/hash verification (a naive `===`/`!==` compare can leak how

&#x20;\* many leading characters matched via response-time differences). \*/

function timingSafeEqual\_(a, b) {

&#x20; if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;

&#x20; var result = 0;

&#x20; for (var i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);

&#x20; return result === 0;

}



function bytesToHex\_(bytes) {

&#x20; return bytes.map(function (b) { return ('0' + (b \& 0xFF).toString(16)).slice(-2); }).join('');

}



/\*\* Number of HMAC rounds applied when hashing a password. Apps Script has

&#x20;\* no bcrypt/scrypt/native PBKDF2, so this hand-rolls equivalent key

&#x20;\* stretching by chaining HMAC-SHA256: a single unsalted-work-factor SHA-256

&#x20;\* pass computes in microseconds, which means an offline attacker with a

&#x20;\* leaked Users tab could try billions of password guesses per second per

&#x20;\* GPU. Iterating thousands of rounds adds real but small latency to one

&#x20;\* legitimate login (a few hundred ms at most) while making the same

&#x20;\* offline attack thousands of times slower. Raise this over time as

&#x20;\* hardware gets faster; lower it only if login latency becomes a problem.

&#x20;\* NOTE: changing this constant changes the hash format — any passwords

&#x20;\* already set with a different value need to be reset via

&#x20;\* adminSetPassword\_ afterward, since old hashes won't verify under a new

&#x20;\* iteration count. \*/

var PASSWORD\_HASH\_ITERATIONS = 1000; // Rev 3: reduced from 10000 for performance (A4/A6)



/\*\* Iterated HMAC-SHA256(salt, password), hex-encoded — see

&#x20;\* PASSWORD\_HASH\_ITERATIONS above for why this isn't a single digest pass. \*/

function hashPassword\_(password, salt) {

&#x20; var data = 'v1:' + password;

&#x20; var hex;

&#x20; for (var i = 0; i < PASSWORD\_HASH\_ITERATIONS; i++) {

&#x20;   hex = bytesToHex\_(Utilities.computeHmacSha256Signature(data, salt));

&#x20;   data = hex;

&#x20; }

&#x20; return hex;

}



function makeSalt\_() {

&#x20; return Utilities.getUuid();

}



function verifyPassword\_(password, salt, expectedHash) {

&#x20; if (!salt || !expectedHash) return false;

&#x20; return timingSafeEqual\_(hashPassword\_(password, salt), expectedHash);

}



/\*\* Minimal HMAC-signed session token — no external JWT library needed.

&#x20;\* Payload: base64({uid, exp}); Signature: HMAC-SHA256(payload, TOKEN\_SECRET). \*/

function signToken\_(email, isMobile) {

&#x20; var secret = PROPS.getProperty('TOKEN\_SECRET');

&#x20; if (!secret) throw new Error('Server misconfigured: TOKEN\_SECRET script property not set.');

&#x20; var ttl = isMobile ? TOKEN\_TTL\_MOBILE\_MS : TOKEN\_TTL\_MS;

&#x20; var payload = JSON.stringify({ uid: email, exp: Date.now() + ttl });

&#x20; var payloadB64 = Utilities.base64EncodeWebSafe(payload);

&#x20; var sigBytes = Utilities.computeHmacSha256Signature(payloadB64, secret);

&#x20; var sigHex = bytesToHex\_(sigBytes);

&#x20; return payloadB64 + '.' + sigHex;

}



function verifyToken\_(token) {

&#x20; var secret = PROPS.getProperty('TOKEN\_SECRET');

&#x20; if (!secret || !token) return null;

&#x20; var parts = token.split('.');

&#x20; if (parts.length !== 2) return null;

&#x20; var payloadB64 = parts\[0], sigHex = parts\[1];

&#x20; var expectedSigBytes = Utilities.computeHmacSha256Signature(payloadB64, secret);

&#x20; var expectedHex = bytesToHex\_(expectedSigBytes);

&#x20; if (!timingSafeEqual\_(expectedHex, sigHex)) return null;

&#x20; try {

&#x20;   var payload = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(payloadB64)).getDataAsString());

&#x20;   if (!payload.exp || Date.now() > payload.exp) return null;

&#x20;   return payload; // { uid: email, exp }

&#x20; } catch (e) {

&#x20;   return null;

&#x20; }

}



/\*\* "Screen: Lubrication Explorer" -> "lubrication\_explorer" — matches the

&#x20;\* screenKey strings the frontend's nav and route guards already use. \*/

function screenKeyFromHeader\_(header) {

&#x20; return header.replace(/^Screen:\\s\*/, '').trim().toLowerCase().replace(/\\s+/g, '\_');

}



/\*\* "Can: editData" -> "editData" — already camelCase after the prefix. \*/

function capabilityKeyFromHeader\_(header) {

&#x20; return header.replace(/^Can:\\s\*/, '').trim();

}



/\*\*

&#x20;\* Resolves a Title name into { dataScope, screenAccess, capabilities } by

&#x20;\* joining Titles -> Permission Templates. Cached per request via a module

&#x20;\* cache would be nice but Apps Script has no real request-scoped state, so

&#x20;\* this re-reads the (small, \~12-row) Permission Templates sheet each call —

&#x20;\* fine at this data volume.

&#x20;\*/

function resolvePermissionTemplate\_(titleName) {

&#x20; var titles = readRows\_(BOOK.CONFIG, SHEETS.TITLES);

&#x20; var titleRow = titles.filter(function (t) { return t\['Title Name'] === titleName; })\[0];

&#x20; var templateName = titleRow ? titleRow\['Permission Template'] : null;



&#x20; var sheet = getSheet\_(BOOK.CONFIG, SHEETS.PERMISSION\_TEMPLATES);

&#x20; var table = readTable\_(sheet);

&#x20; var row = table.rows.filter(function (r) { return r\['Title'] === (templateName || titleName); })\[0];



&#x20; var screenAccess = {};

&#x20; var capabilities = {};

&#x20; var dataScope = 'OWN\_ORG';



&#x20; if (row) {

&#x20;   dataScope = String(row\['Data Scope'] || 'OWN\_ORG').toUpperCase();

&#x20;   table.headers.forEach(function (h) {

&#x20;     if (!h) return;

&#x20;     if (h.indexOf('Screen:') === 0) screenAccess\[screenKeyFromHeader\_(h)] = boolFromYesNo\_(row\[h]);

&#x20;     else if (h.indexOf('Can:') === 0) capabilities\[capabilityKeyFromHeader\_(h)] = boolFromYesNo\_(row\[h]);

&#x20;   });

&#x20; }



&#x20; return { dataScope: dataScope, screenAccess: screenAccess, capabilities: capabilities, templateName: templateName };

}



/\*\* Builds the full AuthUser object the frontend expects, from a Users-tab row + email. \*/

function buildAuthUser\_(userRow) {

&#x20; var titles = readRows\_(BOOK.CONFIG, SHEETS.TITLES);

&#x20; var titleRow = titles.filter(function (t) { return t\['Title Name'] === userRow\['Title']; })\[0];

&#x20; var orgName = titleRow ? titleRow\['Organization'] : null;

&#x20; if (orgName === '(all orgs)') orgName = null;



&#x20; var perm = resolvePermissionTemplate\_(userRow\['Title']);



&#x20; return {

&#x20;   id: userRow\['Email'],

&#x20;   name: userRow\['Name'],

&#x20;   email: userRow\['Email'],

&#x20;   titleId: userRow\['Title'] || null,

&#x20;   titleName: userRow\['Title'] || null,

&#x20;   organizationId: orgName,        // organization NAME is used as the id throughout this script —

&#x20;   organizationName: orgName,      // there is no separate cuid in the spreadsheet design.

&#x20;   dataScope: perm.dataScope === 'ALL\_ORGS' ? 'ALL\_ORGS' : 'OWN\_ORG',

&#x20;   screenAccess: perm.screenAccess,

&#x20;   capabilities: perm.capabilities,

&#x20;   languagePref: userRow\['Language'] || 'en',

&#x20;   mustChangePassword: boolFromYesNo\_(userRow\['Must Change Password']),

&#x20;   active: boolFromYesNo\_(userRow\['Active'])

&#x20; };

}



function findUserRowByEmail\_(email) {

&#x20; var rows = readRows\_(BOOK.CONFIG, SHEETS.USERS);

&#x20; for (var i = 0; i < rows.length; i++) {

&#x20;   if (String(rows\[i]\['Email']).toLowerCase() === String(email).toLowerCase()) return rows\[i];

&#x20; }

&#x20; return null;

}



/\*\* Verifies the token and returns a fresh AuthUser — re-read from the sheet

&#x20;\* every call (not decoded from the token) so a permission-template edit by

&#x20;\* Super Admin takes effect on the user's very next request. \*/

function requireAuth\_(token) {

&#x20; var payload = verifyToken\_(token);

&#x20; if (!payload) throw apiError\_(401, 'Missing or invalid session token.');

&#x20; var userRow = findUserRowByEmail\_(payload.uid);

&#x20; if (!userRow || !boolFromYesNo\_(userRow\['Active'])) throw apiError\_(401, 'Account not found or deactivated.');

&#x20; return buildAuthUser\_(userRow);

}



function requireScreen\_(user, screenKey) {

&#x20; if (!user.screenAccess\[screenKey]) throw apiError\_(403, 'No access to screen: ' + screenKey);

}



function requireCapability\_(user, capabilityKey) {

&#x20; if (!user.capabilities\[capabilityKey]) throw apiError\_(403, 'Missing capability: ' + capabilityKey);

}



/\*\* OWN\_ORG-scoped callers are restricted to their own org; ALL\_ORGS callers see everything. \*/

function orgScopeOrNull\_(user, requestedContractor) {

&#x20; if (user.dataScope === 'ALL\_ORGS') return requestedContractor || null;

&#x20; return user.organizationId || '\_\_none\_\_';

}



// ─────────────────────────────────────────────────────────────────────────

// DUE-DATE / STATUS-BUCKET / COMPLIANCE LOGIC

// Ported 1:1 from the Node backend's framework-free backend/src/lib/dueDate.ts

// so the numbers match exactly (reference: 657 calendar points, 560 overdue,

// 14.8% compliance against the real 902-point register at handover).

// ─────────────────────────────────────────────────────────────────────────



function daysBetween\_(from, to) {

&#x20; var f = new Date(from); f.setHours(0, 0, 0, 0);

&#x20; var t = new Date(to); t.setHours(0, 0, 0, 0);

&#x20; return Math.round((t.getTime() - f.getTime()) / 86400000);

}



function bucketFromDaysToDue\_(daysToDue) {

&#x20; if (daysToDue < 0) return 'OVERDUE';

&#x20; if (daysToDue === 0) return 'DUE\_TODAY';

&#x20; if (daysToDue <= 7) return 'DUE\_THIS\_WEEK';

&#x20; if (daysToDue <= 30) return 'DUE\_THIS\_MONTH';

&#x20; return 'OK';

}



/\*\*

&#x20;\* lp: { frequencyType, frequencyIntervalDays, lastChangeDateCache, oaRequired, oaIntervalDays, oaLastSampleDate }

&#x20;\* frequencyType is matched case-insensitively against 'calendar' | 'oil\_analysis' | 'as\_needed'

&#x20;\* (the literal lowercase values used in the Lubrication Points sheet).

&#x20;\*/

function computeLubricationStatus\_(lp, today) {

&#x20; today = today || new Date();

&#x20; var ft = String(lp.frequencyType || '').toLowerCase();

&#x20; if (ft === 'as\_needed' || ft === 'oil\_analysis') {

&#x20;   return { nextDue: null, daysToDue: null, bucket: 'CONDITION\_MONITORING' };

&#x20; }

&#x20; // calendar

&#x20; if (!lp.lastChangeDateCache || !lp.frequencyIntervalDays) {

&#x20;   return { nextDue: null, daysToDue: null, bucket: 'NO\_HISTORY' };

&#x20; }

&#x20; var lastChange = new Date(lp.lastChangeDateCache);

&#x20; var nextDue = new Date(lastChange);

&#x20; nextDue.setDate(nextDue.getDate() + Number(lp.frequencyIntervalDays));

&#x20; var daysToDue = daysBetween\_(today, nextDue);

&#x20; return { nextDue: nextDue, daysToDue: daysToDue, bucket: bucketFromDaysToDue\_(daysToDue) };

}



function computeOilAnalysisStatus\_(lp, today) {

&#x20; today = today || new Date();

&#x20; if (!lp.oaRequired) return { nextDue: null, daysToDue: null, bucket: 'CONDITION\_MONITORING' };

&#x20; if (!lp.oaLastSampleDate || !lp.oaIntervalDays) return { nextDue: null, daysToDue: null, bucket: 'NO\_HISTORY' };

&#x20; var lastSample = new Date(lp.oaLastSampleDate);

&#x20; var nextDue = new Date(lastSample);

&#x20; nextDue.setDate(nextDue.getDate() + Number(lp.oaIntervalDays));

&#x20; var daysToDue = daysBetween\_(today, nextDue);

&#x20; return { nextDue: nextDue, daysToDue: daysToDue, bucket: bucketFromDaysToDue\_(daysToDue) };

}



function computeComplianceStats\_(points, today) {

&#x20; today = today || new Date();

&#x20; var calendarPoints = points.filter(function (p) { return String(p.frequencyType).toLowerCase() === 'calendar'; });

&#x20; var stats = { totalCalendarPoints: calendarPoints.length, overdue: 0, dueToday: 0, dueThisWeek: 0, dueThisMonth: 0, ok: 0, noHistory: 0, compliancePct: 0 };

&#x20; calendarPoints.forEach(function (p) {

&#x20;   var bucket = computeLubricationStatus\_(p, today).bucket;

&#x20;   if (bucket === 'OVERDUE') stats.overdue++;

&#x20;   else if (bucket === 'DUE\_TODAY') stats.dueToday++;

&#x20;   else if (bucket === 'DUE\_THIS\_WEEK') stats.dueThisWeek++;

&#x20;   else if (bucket === 'DUE\_THIS\_MONTH') stats.dueThisMonth++;

&#x20;   else if (bucket === 'OK') stats.ok++;

&#x20;   else if (bucket === 'NO\_HISTORY') stats.noHistory++;

&#x20; });

&#x20; stats.compliancePct = stats.totalCalendarPoints

&#x20;   ? Math.round(((stats.totalCalendarPoints - stats.overdue) / stats.totalCalendarPoints) \* 1000) / 10

&#x20;   : 0;

&#x20; return stats;

}



function computeOilAnalysisStats\_(points, today) {

&#x20; today = today || new Date();

&#x20; var oaPoints = points.filter(function (p) { return p.oaRequired; });

&#x20; var stats = { totalOaPoints: oaPoints.length, overdue: 0, dueThisMonth: 0, ok: 0, noHistory: 0 };

&#x20; oaPoints.forEach(function (p) {

&#x20;   var bucket = computeOilAnalysisStatus\_(p, today).bucket;

&#x20;   if (bucket === 'OVERDUE') stats.overdue++;

&#x20;   else if (bucket === 'DUE\_THIS\_WEEK' || bucket === 'DUE\_THIS\_MONTH') stats.dueThisMonth++;

&#x20;   else if (bucket === 'OK') stats.ok++;

&#x20;   else if (bucket === 'NO\_HISTORY') stats.noHistory++;

&#x20; });

&#x20; return stats;

}



// ─────────────────────────────────────────────────────────────────────────

// DOMAIN INDEXES — join Lubrication Points (Operational) with Equipment /

// Areas / Organizations (Config), and compute each point's cached

// "last approved change date" from Lubrication History (since the sheet,

// unlike the old Prisma model, has no lastChangeDateCache column — it's

// derived fresh from the latest APPROVED history row each request).

// ─────────────────────────────────────────────────────────────────────────



function getAreaOrgMap\_() {

&#x20; var areas = readRows\_(BOOK.CONFIG, SHEETS.AREAS);

&#x20; var map = {};

&#x20; areas.forEach(function (a) { map\[a\['Area Name']] = a\['Contractor']; });

&#x20; return map;

}



function getEquipmentMap\_() {

&#x20; var equipment = readRows\_(BOOK.CONFIG, SHEETS.EQUIPMENT);

&#x20; var map = {};

&#x20; equipment.forEach(function (e) { map\[e\['Equipment Code']] = e; });

&#x20; return map;

}



/\*\* lpIdCode -> latest Date among APPROVED Lubrication History rows for that point. \*/

function getLastApprovedDateMap\_() {

&#x20; var rows = readRows\_(BOOK.OPERATIONAL, SHEETS.LUBRICATION\_HISTORY);

&#x20; var map = {};

&#x20; rows.forEach(function (r) {

&#x20;   if (r\['Status'] !== 'APPROVED') return;

&#x20;   var lpId = r\['LP ID'];

&#x20;   var d = toDateOrNull\_(r\['Lubrication Date']);

&#x20;   if (!d) return;

&#x20;   if (!map\[lpId] || d > map\[lpId]) map\[lpId] = d;

&#x20; });

&#x20; return map;

}



/\*\*

&#x20;\* Returns every Lubrication Point joined with Equipment/Area/Organization

&#x20;\* context and its computed lastChangeDateCache, ready for status math.

&#x20;\* This is the single most-used index in the app — built once per request.

&#x20;\*/

function getLpIndex\_() {

&#x20; if (\_\_requestLpIndex) return \_\_requestLpIndex;

&#x20; var ver = PROPS.getProperty('DATA\_CACHE\_VERSION') || '0';

&#x20; var cacheKey = 'lp\_index\_v\_' + ver;

&#x20; var cached = scriptCacheGet\_(cacheKey);

&#x20; if (cached) {

&#x20;   \_\_requestLpIndex = cached;

&#x20;   return cached;

&#x20; }



&#x20; var lpRows = readRows\_(BOOK.OPERATIONAL, SHEETS.LUBRICATION\_POINTS);

&#x20; var equipmentMap = getEquipmentMap\_();

&#x20; var lastApproved = getLastApprovedDateMap\_();



&#x20; var built = lpRows.map(function (r) {

&#x20;   var equipmentCode = r\['Equipment Code'];

&#x20;   var equipment = equipmentMap\[equipmentCode] || {};

&#x20;   return {

&#x20;     lpIdCode: r\['LP ID'],

&#x20;     equipmentIdCode: equipmentCode,

&#x20;     assetName: r\['Equipment Name'] || equipment\['Asset Name'] || null,

&#x20;     areaName: r\['Area'] || equipment\['Area'] || null,

&#x20;     contractor: r\['Contractor'] || equipment\['Contractor'] || null,

&#x20;     pointDescription: r\['Point Description'],

&#x20;     pointCode: r\['Point Code'] || null,

&#x20;     position: r\['Position'] || null,

&#x20;     lubricantType: r\['Lubricant Type'] || null,

&#x20;     standardQuantityL: r\['Standard Qty (L)'] === '' ? null : r\['Standard Qty (L)'],

&#x20;     frequencyType: r\['Frequency Type'],

&#x20;     frequencyLabel: r\['Frequency Label'] || null,

&#x20;     frequencyIntervalDays: r\['Frequency Interval (days)'] === '' ? null : r\['Frequency Interval (days)'],

&#x20;     ohHoursReference: r\['OH Hours Reference'] === '' ? null : r\['OH Hours Reference'],

&#x20;     oaRequired: boolFromYesNo\_(r\['Oil Analysis Required']),

&#x20;     oaIntervalDays: r\['OA Interval (days)'] === '' ? null : r\['OA Interval (days)'],

&#x20;     oaIntervalLabel: r\['OA Interval Label'] || null,

&#x20;     oaLastSampleDate: toDateOrNull\_(r\['Last Oil Sample Date']),

&#x20;     remarks: r\['Remarks'] || null,

&#x20;     gearboxBrand: equipment\['Gearbox Brand'] || null,

&#x20;     opTempC: equipment\['Operating Temp (°C)'] === undefined || equipment\['Operating Temp (°C)'] === '' ? null : equipment\['Operating Temp (°C)'],

&#x20;     annualRhActual: equipment\['Annual RH Actual'] === undefined || equipment\['Annual RH Actual'] === '' ? null : equipment\['Annual RH Actual'],

&#x20;     lastChangeDateCache: lastApproved\[r\['LP ID']] || null,

&#x20;     \_\_row: r.\_\_row

&#x20;   };

&#x20; });

&#x20; \_\_requestLpIndex = built;

&#x20; scriptCachePut\_(cacheKey, built, 300);

&#x20; return built;

}



function lpStatusInput\_(lp) {

&#x20; return {

&#x20;   frequencyType: lp.frequencyType,

&#x20;   frequencyIntervalDays: lp.frequencyIntervalDays,

&#x20;   lastChangeDateCache: lp.lastChangeDateCache,

&#x20;   oaRequired: lp.oaRequired,

&#x20;   oaIntervalDays: lp.oaIntervalDays,

&#x20;   oaLastSampleDate: lp.oaLastSampleDate

&#x20; };

}



/\*\* Org-scope filter applied uniformly across LP-derived endpoints. \*/

function filterLpByOrg\_(points, organizationId) {

&#x20; if (!organizationId) return points;

&#x20; return points.filter(function (p) { return p.contractor === organizationId; });

}



// ─────────────────────────────────────────────────────────────────────────

// NOTIFICATIONS \& AUDIT LOG

// ─────────────────────────────────────────────────────────────────────────



/\*\* Resolves routing tokens (OWN\_ORG\_ENGINEER, ACC\_MANAGER, SUPER\_ADMIN, ...)

&#x20;\* into concrete user emails. Ported from backend/src/lib/notify.ts. \*/

function resolveRecipients\_(tokens, organizationId, extraEmails) {

&#x20; var emails = {};

&#x20; (extraEmails || \[]).forEach(function (e) { emails\[e] = true; });



&#x20; var users = readRows\_(BOOK.CONFIG, SHEETS.USERS);

&#x20; var titles = readRows\_(BOOK.CONFIG, SHEETS.TITLES);

&#x20; var titleOrgByName = {};

&#x20; titles.forEach(function (t) { titleOrgByName\[t\['Title Name']] = t\['Organization']; });



&#x20; var fragmentByToken = { OWN\_ORG\_TECHNICIAN: 'Technician', OWN\_ORG\_ENGINEER: 'Engineer', OWN\_ORG\_MANAGER: 'Manager' };



&#x20; tokens.forEach(function (token) {

&#x20;   token = token.trim();

&#x20;   if (token === 'UPLOADER' || token === 'SELF') return; // handled via extraEmails by the caller

&#x20;   if (token === 'SUPER\_ADMIN') {

&#x20;     users.filter(function (u) { return u\['Title'] === 'Super Admin'; }).forEach(function (u) { emails\[u\['Email']] = true; });

&#x20;     return;

&#x20;   }

&#x20;   if (token === 'ACC\_ENGINEER' || token === 'ACC\_MANAGER') {

&#x20;     var titleName = token === 'ACC\_ENGINEER' ? 'ACC Engineer' : 'ACC Manager';

&#x20;     users.filter(function (u) { return u\['Title'] === titleName; }).forEach(function (u) { emails\[u\['Email']] = true; });

&#x20;     return;

&#x20;   }

&#x20;   var fragment = fragmentByToken\[token];

&#x20;   if (fragment \&\& organizationId) {

&#x20;     users.forEach(function (u) {

&#x20;       var org = titleOrgByName\[u\['Title']];

&#x20;       if (org === organizationId \&\& String(u\['Title'] || '').indexOf(fragment) !== -1) emails\[u\['Email']] = true;

&#x20;     });

&#x20;   }

&#x20; });

&#x20; return Object.keys(emails);

}



/\*\*

&#x20;\* Creates Notifications rows for whoever the routing rules for `typeName`

&#x20;\* say should be notified. organizationId is the event's org context (null

&#x20;\* for global events). Silently no-ops on an unknown type, same as before.

&#x20;\*/

function notify\_(opts) {

&#x20; var types = readRows\_(BOOK.CONFIG, SHEETS.NOTIFICATION\_TYPES);

&#x20; var type = types.filter(function (t) { return t\['Name'] === opts.typeName; })\[0];

&#x20; if (!type) return;

&#x20; var tokens = String(type\['Recipients'] || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);

&#x20; var recipients = resolveRecipients\_(tokens, opts.organizationId || null, opts.extraEmails || \[]);

&#x20; if (recipients.length === 0) return;



&#x20; recipients.forEach(function (email) {

&#x20;   withScriptLock\_(function () {

&#x20;     var id = nextSequentialId\_(BOOK.OPERATIONAL, SHEETS.NOTIFICATIONS, 'Notification ID', 'NTF-', 5);

&#x20;     appendRowObj\_(BOOK.OPERATIONAL, SHEETS.NOTIFICATIONS, {

&#x20;       'Notification ID': id,

&#x20;       'User Email': email,

&#x20;       'Type': opts.typeName,

&#x20;       'Message': opts.message,

&#x20;       'Related Entity Type': opts.relatedEntityType || '',

&#x20;       'Related Entity ID': opts.relatedEntityId || '',

&#x20;       'Priority': type\['Default Priority'] || 'INFO',

&#x20;       'Status': 'UNREAD',

&#x20;       'Created At': new Date()

&#x20;     });

&#x20;   });

&#x20; });

}



/\*\* Appends an Audit Log row. Every ACC data correction / admin-settings

&#x20;\* change lands here with a mandatory reason (Section 9 of the spec). \*/

function writeAuditLog\_(opts) {

&#x20; withScriptLock\_(function () {

&#x20;   var id = nextSequentialId\_(BOOK.OPERATIONAL, SHEETS.AUDIT\_LOG, 'Log ID', 'AUD-', 5);

&#x20;   appendRowObj\_(BOOK.OPERATIONAL, SHEETS.AUDIT\_LOG, {

&#x20;     'Log ID': id,

&#x20;     'Actor Email': opts.actorEmail,

&#x20;     'Action Category': opts.actionCategory,

&#x20;     'Entity Type': opts.entityType,

&#x20;     'Entity ID': opts.entityId,

&#x20;     'Before Value': opts.beforeValue ? JSON.stringify(opts.beforeValue) : '',

&#x20;     'After Value': opts.afterValue ? JSON.stringify(opts.afterValue) : '',

&#x20;     'Reason': opts.reason || '',

&#x20;     'Timestamp': new Date(),

&#x20;     'Visible To Org': opts.visibleToOrg || ''

&#x20;   });

&#x20; });

}



function getSettingValue\_(key, fallback) {

&#x20; var rows = readRows\_(BOOK.CONFIG, SHEETS.GENERAL\_SETTINGS);

&#x20; var row = rows.filter(function (r) { return r\['Key'] === key; })\[0];

&#x20; return row \&\& row\['Value'] !== '' \&\& row\['Value'] !== null ? String(row\['Value']) : fallback;

}



// ─────────────────────────────────────────────────────────────────────────

// API: AUTH

// ─────────────────────────────────────────────────────────────────────────



function api\_loginUser\_(params) {

&#x20; // Rev 3 (A5): Fast-fail before any hashing so invalid-email errors return quickly.

&#x20; var email = String(params.email || '').trim();

&#x20; var password = String(params.password || '');

&#x20; if (!email || !password) throw apiError\_(400, 'Email and password are required.');



&#x20; var userRow = findUserRowByEmail\_(email);



&#x20; // Unknown email — return generic 401 immediately (no hashing)

&#x20; if (!userRow) throw apiError\_(401, 'Invalid email or password.');



&#x20; // Inactive account — clear message, no hashing

&#x20; if (!boolFromYesNo\_(userRow\['Active'])) throw apiError\_(403, 'User inactive. Contact your administrator.');



&#x20; // Password not yet set — clear message, no hashing

&#x20; var hash = userRow\['Password Hash'];

&#x20; var salt = userRow\['Password Salt'];

&#x20; if (!hash || !salt) {

&#x20;   throw apiError\_(403, 'Password not set. Ask a Super Admin to set an initial password.');

&#x20; }



&#x20; // Only hash when we have a real user with a real password (A6 performance)

&#x20; if (!verifyPassword\_(password, salt, hash)) throw apiError\_(401, 'Invalid email or password.');



&#x20; var token = signToken\_(email, !!params.isMobile);

&#x20; // Rev 3 (A6): Include full user object so the frontend can skip the getMe round-trip

&#x20; var authUser = buildAuthUser\_(userRow);

&#x20; return {

&#x20;   token: token,

&#x20;   mustChangePassword: authUser.mustChangePassword,

&#x20;   user: {

&#x20;     id: authUser.id,

&#x20;     name: authUser.name,

&#x20;     email: authUser.email,

&#x20;     title: authUser.titleName,

&#x20;     organization: authUser.organizationName,

&#x20;     languagePref: authUser.languagePref,

&#x20;     themePref: 'default',

&#x20;     screenAccess: authUser.screenAccess,

&#x20;     capabilities: authUser.capabilities,

&#x20;     dataScope: authUser.dataScope,

&#x20;     organizationId: authUser.organizationId,

&#x20;     titleName: authUser.titleName,

&#x20;     organizationName: authUser.organizationName

&#x20;   }

&#x20; };

}



function api\_changePassword\_(params, user) {

&#x20; var current = String(params.currentPassword || '');

&#x20; var next = String(params.newPassword || '');

&#x20; if (next.length < 8) throw apiError\_(400, 'Password must be at least 8 characters.');



&#x20; var userRow = findUserRowByEmail\_(user.email);

&#x20; if (!userRow) throw apiError\_(404, 'User not found.');



&#x20; // Rev 3 (A4): Skip old-password verification on forced change — the token

&#x20; // already proves identity, and skipping one hash saves \~100-200ms.

&#x20; var isForcedChange = boolFromYesNo\_(userRow\['Must Change Password']);

&#x20; if (!isForcedChange \&\& userRow\['Password Hash']) {

&#x20;   if (!verifyPassword\_(current, userRow\['Password Salt'], userRow\['Password Hash'])) {

&#x20;     throw apiError\_(401, 'Current password is incorrect.');

&#x20;   }

&#x20; }

&#x20; var salt = makeSalt\_();

&#x20; var hash = hashPassword\_(next, salt);

&#x20; updateRowByKey\_(BOOK.CONFIG, SHEETS.USERS, 'Email', user.email, {

&#x20;   'Password Hash': hash, 'Password Salt': salt, 'Must Change Password': 'No'

&#x20; });

&#x20; return { success: true };

}



function api\_getMe\_(params, user) {

&#x20; return { user: user };

}



// ─────────────────────────────────────────────────────────────────────────

// API: DASHBOARD

// ─────────────────────────────────────────────────────────────────────────



function resolveOrgFilter\_(user, scopeOrContractorParam) {

&#x20; if (user.dataScope !== 'ALL\_ORGS') return user.organizationId || '\_\_none\_\_';

&#x20; if (!scopeOrContractorParam) return null;

&#x20; var s = String(scopeOrContractorParam).toLowerCase();

&#x20; if (s === 'all') return null;

&#x20; var orgs = readRows\_(BOOK.CONFIG, SHEETS.ORGANIZATIONS);

&#x20; var match = orgs.filter(function (o) { return String(o\['Name']).toLowerCase() === s; })\[0];

&#x20; return match ? match\['Name'] : scopeOrContractorParam;

}



function api\_getDashboardData\_(params, user) {

&#x20; var metric = params.metric || 'kpis';



&#x20; if (metric === 'overdueBreakdown') {

&#x20;   var organizationId = resolveOrgFilter\_(user, null); // breakdown always within the caller's own scope (no cross-contractor mixing)

&#x20;   var groupBy = params.groupBy || 'contractor';

&#x20;   var points = filterLpByOrg\_(getLpIndex\_(), organizationId);

&#x20;   var buckets = {};

&#x20;   points.forEach(function (p) {

&#x20;     var result = computeLubricationStatus\_(lpStatusInput\_(p));

&#x20;     if (result.bucket !== 'OVERDUE') return;

&#x20;     var key;

&#x20;     if (groupBy === 'area') key = p.areaName || 'Unassigned';

&#x20;     else if (groupBy === 'frequency') key = p.frequencyLabel || 'Unknown';

&#x20;     else key = p.contractor || 'Unknown';

&#x20;     buckets\[key] = (buckets\[key] || 0) + 1;

&#x20;   });

&#x20;   return { groupBy: groupBy, breakdown: Object.keys(buckets).map(function (k) { return { key: k, count: buckets\[k] }; }) };

&#x20; }



&#x20; if (metric === 'contractorComparison') {

&#x20;   if (user.dataScope !== 'ALL\_ORGS') throw apiError\_(403, 'Contractor comparison is ACC/Super Admin only.');

&#x20;   var orgs2 = readRows\_(BOOK.CONFIG, SHEETS.ORGANIZATIONS).filter(function (o) { return o\['Type'] === 'contractor'; });

&#x20;   var allPoints = getLpIndex\_();

&#x20;   var history = readRows\_(BOOK.OPERATIONAL, SHEETS.LUBRICATION\_HISTORY);

&#x20;   var plans = readRows\_(BOOK.OPERATIONAL, SHEETS.ACTION\_PLANS);

&#x20;   var results = orgs2.map(function (org) {

&#x20;     var pts = filterLpByOrg\_(allPoints, org\['Name']);

&#x20;     var compliance = computeComplianceStats\_(pts.map(lpStatusInput\_));

&#x20;     var oa = computeOilAnalysisStats\_(pts.map(lpStatusInput\_));

&#x20;     var pending = history.filter(function (h) { return h\['Status'] === 'PENDING\_APPROVAL' \&\& pointBelongsToOrg\_(allPoints, h\['LP ID'], org\['Name']); }).length;

&#x20;     var openActions = plans.filter(function (p) { return \['OPEN', 'IN\_PROGRESS', 'WAITING'].indexOf(p\['Status']) !== -1 \&\& actionPlanBelongsToOrg\_(allPoints, p, org\['Name']); }).length;

&#x20;     return { organization: org\['Name'], totalPoints: pts.length, overdue: compliance.overdue, compliancePct: compliance.compliancePct, oilSamplesOverdue: oa.overdue, pendingApproval: pending, openActionPlans: openActions };

&#x20;   });

&#x20;   return { comparison: results };

&#x20; }



&#x20; // metric === 'kpis' (default)

&#x20; var orgId = resolveOrgFilter\_(user, params.scope);

&#x20; var kpiCacheKey = 'dash\_kpis\_' + (orgId || 'ALL') + '\_v\_' + (PROPS.getProperty('DATA\_CACHE\_VERSION') || '0');

&#x20; var kpiCached = scriptCacheGet\_(kpiCacheKey);

&#x20; if (kpiCached) return kpiCached;



&#x20; var pts2 = filterLpByOrg\_(getLpIndex\_(), orgId);

&#x20; var compliance2 = computeComplianceStats\_(pts2.map(lpStatusInput\_));

&#x20; var oa2 = computeOilAnalysisStats\_(pts2.map(lpStatusInput\_));

&#x20; var conditionMonitoring = pts2.filter(function (p) { return String(p.frequencyType).toLowerCase() === 'as\_needed'; }).length;



&#x20; var lpIdsInScope = {};

&#x20; pts2.forEach(function (p) { lpIdsInScope\[p.lpIdCode] = true; });



&#x20; var historyRows = readRows\_(BOOK.OPERATIONAL, SHEETS.LUBRICATION\_HISTORY);

&#x20; var monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

&#x20; var pendingApproval = 0, completedThisMonth = 0;

&#x20; historyRows.forEach(function (h) {

&#x20;   if (!lpIdsInScope\[h\['LP ID']]) return;

&#x20;   if (h\['Status'] === 'PENDING\_APPROVAL') pendingApproval++;

&#x20;   if (h\['Status'] === 'APPROVED' \&\& h\['Legacy Import'] !== 'Yes') {

&#x20;     var approvedAt = toDateOrNull\_(h\['Approved At']);

&#x20;     if (approvedAt \&\& approvedAt >= monthStart) completedThisMonth++;

&#x20;   }

&#x20; });



&#x20; var planRows = readRows\_(BOOK.OPERATIONAL, SHEETS.ACTION\_PLANS);

&#x20; var openActions = 0, overdueActions = 0;

&#x20; var now = new Date();

&#x20; planRows.forEach(function (p) {

&#x20;   if (orgId \&\& !actionPlanBelongsToOrg\_(pts2, p, orgId)) return;

&#x20;   if (\['OPEN', 'IN\_PROGRESS', 'WAITING'].indexOf(p\['Status']) === -1) return;

&#x20;   openActions++;

&#x20;   var due = toDateOrNull\_(p\['Due Date']);

&#x20;   if (due \&\& due < now) overdueActions++;

&#x20; });



&#x20; var kpiResult = {

&#x20;   totalLubricationPoints: pts2.length,

&#x20;   overdue: compliance2.overdue,

&#x20;   dueToday: compliance2.dueToday,

&#x20;   dueThisWeek: compliance2.dueThisWeek,

&#x20;   dueThisMonth: compliance2.dueThisMonth,

&#x20;   ok: compliance2.ok,

&#x20;   noHistory: compliance2.noHistory,

&#x20;   compliancePct: compliance2.compliancePct,

&#x20;   conditionMonitoringPoints: conditionMonitoring,

&#x20;   oilSamplesOverdue: oa2.overdue,

&#x20;   oilSamplesDueThisMonth: oa2.dueThisMonth,

&#x20;   pendingApproval: pendingApproval,

&#x20;   completedThisMonth: completedThisMonth,

&#x20;   openActionPlans: openActions,

&#x20;   overdueActionPlans: overdueActions

&#x20; };

&#x20; scriptCachePut\_(kpiCacheKey, kpiResult, 120);

&#x20; return kpiResult;

}



function pointBelongsToOrg\_(allPoints, lpId, org) {

&#x20; for (var i = 0; i < allPoints.length; i++) {

&#x20;   if (allPoints\[i].lpIdCode === lpId) return allPoints\[i].contractor === org;

&#x20; }

&#x20; return false;

}



function actionPlanBelongsToOrg\_(pointsInScope, planRow, org) {

&#x20; // Action Plans reference an Equipment code; resolve via the LP index's equipment->contractor join.

&#x20; for (var i = 0; i < pointsInScope.length; i++) {

&#x20;   if (pointsInScope\[i].equipmentIdCode === planRow\['Equipment']) return pointsInScope\[i].contractor === org;

&#x20; }

&#x20; return false;

}



// ─────────────────────────────────────────────────────────────────────────

// API: LUBRICATION POINTS (Explorer + Details + ACC correction)

// ─────────────────────────────────────────────────────────────────────────



function api\_getLubricationPoints\_(params, user) {

&#x20; var orgId = user.dataScope !== 'ALL\_ORGS' ? (user.organizationId || '\_\_none\_\_') : (params.contractor || null);

&#x20; var points = filterLpByOrg\_(getLpIndex\_(), orgId);



&#x20; if (params.area) points = points.filter(function (p) { return p.areaName === params.area; });

&#x20; if (params.equipment) points = points.filter(function (p) { return p.equipmentIdCode === params.equipment; });

&#x20; if (params.frequency) points = points.filter(function (p) { return String(p.frequencyType).toLowerCase() === String(params.frequency).toLowerCase(); });

&#x20; if (params.lubricant) points = points.filter(function (p) { return p.lubricantType === params.lubricant; });

&#x20; if (params.search) {

&#x20;   var s = String(params.search).toLowerCase();

&#x20;   points = points.filter(function (p) {

&#x20;     return (p.lpIdCode || '').toLowerCase().indexOf(s) !== -1 ||

&#x20;       (p.pointDescription || '').toLowerCase().indexOf(s) !== -1 ||

&#x20;       (p.equipmentIdCode || '').toLowerCase().indexOf(s) !== -1 ||

&#x20;       (p.assetName || '').toLowerCase().indexOf(s) !== -1;

&#x20;   });

&#x20; }



&#x20; var rows = points.map(function (p) {

&#x20;   var lubStatus = computeLubricationStatus\_(lpStatusInput\_(p));

&#x20;   var oaStatus = p.oaRequired ? computeOilAnalysisStatus\_(lpStatusInput\_(p)) : null;

&#x20;   return {

&#x20;     id: p.lpIdCode,

&#x20;     lpIdCode: p.lpIdCode,

&#x20;     equipmentIdCode: p.equipmentIdCode,

&#x20;     assetName: p.assetName,

&#x20;     pointDescription: p.pointDescription,

&#x20;     areaName: p.areaName,

&#x20;     contractor: p.contractor,

&#x20;     lubricantType: p.lubricantType,

&#x20;     standardQuantityL: p.standardQuantityL,

&#x20;     frequencyLabel: p.frequencyLabel,

&#x20;     frequencyType: p.frequencyType,

&#x20;     lastChangeDate: toIso\_(p.lastChangeDateCache),

&#x20;     nextDue: toIso\_(lubStatus.nextDue),

&#x20;     status: lubStatus.bucket,

&#x20;     oaStatus: oaStatus ? oaStatus.bucket : null

&#x20;   };

&#x20; });



&#x20; if (params.status) rows = rows.filter(function (r) { return r.status === params.status; });

&#x20; if (params.routeType === 'Sampling') {

&#x20;   rows = rows.filter(function (r) { return r.oaStatus !== null; });

&#x20; } else if (params.routeType === 'Oil Change') {

&#x20;   rows = rows.filter(function (r) { return r.oaStatus === null; });

&#x20; }

&#x20; if (params.equipmentIds) {

&#x20;   var eqIds = String(params.equipmentIds).split(',').map(function (s) { return s.trim(); }).filter(Boolean);

&#x20;   if (eqIds.length) {

&#x20;     rows = rows.filter(function (r) {

&#x20;       return eqIds.indexOf(r.equipmentIdCode) !== -1;

&#x20;     });

&#x20;   }

&#x20; }



&#x20; var pageNum = Math.max(1, parseInt(params.page || '1', 10) || 1);

&#x20; var requestedSize = parseInt(params.pageSize || '50', 10) || 50;

&#x20; var size = Math.min(900, Math.max(1, requestedSize));

&#x20; var start = (pageNum - 1) \* size;

&#x20; var paged = rows.slice(start, start + size);



&#x20; return { total: rows.length, page: pageNum, pageSize: size, rows: paged, hasMore: (start + paged.length) < rows.length };

}



function api\_getLubricationPointById\_(params, user) {

&#x20; var id = params.id;

&#x20; var points = getLpIndex\_();

&#x20; var p = points.filter(function (x) { return x.lpIdCode === id; })\[0];

&#x20; if (!p) throw apiError\_(404, 'Lubrication point not found.');

&#x20; if (user.dataScope !== 'ALL\_ORGS' \&\& p.contractor !== user.organizationId) {

&#x20;   throw apiError\_(403, "Not authorized for this organization's data.");

&#x20; }



&#x20; var history = readRows\_(BOOK.OPERATIONAL, SHEETS.LUBRICATION\_HISTORY)

&#x20;   .filter(function (h) { return h\['LP ID'] === id; })

&#x20;   .sort(function (a, b) { return toDateOrNull\_(b\['Lubrication Date']) - toDateOrNull\_(a\['Lubrication Date']); });



&#x20; var oilSamples = readRows\_(BOOK.OPERATIONAL, SHEETS.OIL\_SAMPLES)

&#x20;   .filter(function (s) { return s\['LP ID'] === id; })

&#x20;   .sort(function (a, b) { return toDateOrNull\_(b\['Sampled Date']) - toDateOrNull\_(a\['Sampled Date']); });



&#x20; var actionPlans = readRows\_(BOOK.OPERATIONAL, SHEETS.ACTION\_PLANS).filter(function (a) {

&#x20;   if (a\['Equipment'] !== p.equipmentIdCode) return false;

&#x20;   var lpIds = String(a\['LP IDs'] || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);

&#x20;   return lpIds.length === 0 || lpIds.indexOf(id) !== -1;

&#x20; }).sort(function (a, b) { return toDateOrNull\_(b\['Created At']) - toDateOrNull\_(a\['Created At']); });



&#x20; var lubStatus = computeLubricationStatus\_(lpStatusInput\_(p));

&#x20; var oaStatus = p.oaRequired ? computeOilAnalysisStatus\_(lpStatusInput\_(p)) : null;



&#x20; return {

&#x20;   id: p.lpIdCode,

&#x20;   lpIdCode: p.lpIdCode,

&#x20;   pointDescription: p.pointDescription,

&#x20;   pointCode: p.pointCode,

&#x20;   position: p.position,

&#x20;   equipment: {

&#x20;     id: p.equipmentIdCode,

&#x20;     code: p.equipmentIdCode,

&#x20;     name: p.assetName,

&#x20;     area: p.areaName,

&#x20;     contractor: p.contractor,

&#x20;     gearboxBrand: p.gearboxBrand,

&#x20;     opTempC: p.opTempC,

&#x20;     annualRhActual: p.annualRhActual

&#x20;   },

&#x20;   lubricantType: p.lubricantType ? { name: p.lubricantType, brand: null } : null,

&#x20;   standardQuantityL: p.standardQuantityL,

&#x20;   frequencyLabel: p.frequencyLabel,

&#x20;   frequencyType: p.frequencyType,

&#x20;   ohHoursReference: p.ohHoursReference,

&#x20;   oaRequired: p.oaRequired,

&#x20;   oaIntervalLabel: p.oaIntervalLabel,

&#x20;   remarks: p.remarks,

&#x20;   status: lubStatus.bucket,

&#x20;   nextDue: toIso\_(lubStatus.nextDue),

&#x20;   oaStatus: oaStatus ? oaStatus.bucket : null,

&#x20;   history: history.map(function (h) {

&#x20;     return {

&#x20;       id: h\['Record ID'],

&#x20;       date: toIso\_(h\['Lubrication Date']),

&#x20;       technician: h\['Technician'] || (h\['Legacy Import'] === 'Yes' ? 'Legacy import' : null),

&#x20;       quantityUsedL: h\['Quantity Used (L)'] === '' ? null : h\['Quantity Used (L)'],

&#x20;       oilType: h\['Oil Type Used'] || null,

&#x20;       status: h\['Status'],

&#x20;       remarks: h\['Remarks'] || null,

&#x20;       isLegacyImport: h\['Legacy Import'] === 'Yes',

&#x20;       approvedBy: h\['Approved By'] || null

&#x20;     };

&#x20;   }),

&#x20;   oilSamples: oilSamples.map(function (s) {

&#x20;     return { id: s\['Lab Sample ID'], sampledDate: toIso\_(s\['Sampled Date']), reportStatus: s\['Report Status'], sampleIdLab: s\['Lab Sample ID'] };

&#x20;   }),

&#x20;   actionPlans: actionPlans.map(function (a) {

&#x20;     return { id: a\['Action ID'], type: a\['Action Type'], description: a\['Description'], priority: a\['Priority'], status: a\['Status'], owner: a\['Owner'] || null, dueDate: toIso\_(a\['Due Date']) };

&#x20;   })

&#x20; };

}



function api\_updateLubricationPoint\_(params, user) {

&#x20; if (!user.capabilities.editData) throw apiError\_(403, 'Missing capability: editData');

&#x20; if (!params.reason) throw apiError\_(400, 'A reason is required for ACC corrections.');



&#x20; var id = params.id;

&#x20; var sheet = getSheet\_(BOOK.OPERATIONAL, SHEETS.LUBRICATION\_POINTS);

&#x20; var table = readTable\_(sheet);

&#x20; var before = table.rows.filter(function (r) { return r\['LP ID'] === id; })\[0];

&#x20; if (!before) throw apiError\_(404, 'Lubrication point not found.');



&#x20; var updates = {};

&#x20; if (params.standardQuantityL !== undefined) updates\['Standard Qty (L)'] = params.standardQuantityL === null ? '' : params.standardQuantityL;

&#x20; if (params.lubricantTypeId !== undefined) updates\['Lubricant Type'] = params.lubricantTypeId === null ? '' : params.lubricantTypeId;

&#x20; if (params.remarks !== undefined) updates\['Remarks'] = params.remarks === null ? '' : params.remarks;



&#x20; updateRowByKey\_(BOOK.OPERATIONAL, SHEETS.LUBRICATION\_POINTS, 'LP ID', id, updates);



&#x20; var equipmentMap = getEquipmentMap\_();

&#x20; var org = (equipmentMap\[before\['Equipment Code']] || {})\['Contractor'] || before\['Contractor'] || null;



&#x20; writeAuditLog\_({

&#x20;   actorEmail: user.email,

&#x20;   actionCategory: 'DATA\_EDIT',

&#x20;   entityType: 'LubricationPoint',

&#x20;   entityId: id,

&#x20;   beforeValue: before,

&#x20;   afterValue: updates,

&#x20;   reason: params.reason,

&#x20;   visibleToOrg: org

&#x20; });



&#x20; return { success: true, lubricationPoint: api\_getLubricationPointById\_({ id: id }, user) };

}



// ─────────────────────────────────────────────────────────────────────────

// API: LUBRICATION RECORDS (submit / pending approvals / approve / reject)

// All rows live in the single "Lubrication History" tab, status-filtered —

// there is no separate "Pending Approvals" tab, matching the existing

// workbook's design (status column already distinguishes the two).

// ─────────────────────────────────────────────────────────────────────────



function api\_submitLubrication\_(params, user) {

&#x20; if (!user.capabilities.submit) throw apiError\_(403, 'Missing capability: submit');

&#x20; if (!params.lpId) throw apiError\_(400, 'lpId is required.');

&#x20; if (!params.lubricationDate) throw apiError\_(400, 'lubricationDate is required.');



&#x20; var lubricationDate = new Date(params.lubricationDate);

&#x20; var todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

&#x20; if (lubricationDate > todayEnd) throw apiError\_(400, 'Lubrication date cannot be in the future.');



&#x20; var points = getLpIndex\_();

&#x20; var lp = points.filter(function (p) { return p.lpIdCode === params.lpId; })\[0];

&#x20; if (!lp) throw apiError\_(404, 'Lubrication point not found.');

&#x20; if (user.dataScope !== 'ALL\_ORGS' \&\& lp.contractor !== user.organizationId) {

&#x20;   throw apiError\_(403, "Not authorized for this organization's data.");

&#x20; }



&#x20; var quantityUsedL = params.quantityUsedL === undefined || params.quantityUsedL === null ? '' : Number(params.quantityUsedL);

&#x20; var oilTypeUsed = params.oilTypeUsedId || lp.lubricantType || '';



&#x20; var id;

&#x20; withScriptLock\_(function () {

&#x20;   id = nextSequentialId\_(BOOK.OPERATIONAL, SHEETS.LUBRICATION\_HISTORY, 'Record ID', 'REC-', 5);

&#x20;   appendRowObj\_(BOOK.OPERATIONAL, SHEETS.LUBRICATION\_HISTORY, {

&#x20;     'Record ID': id,

&#x20;     'LP ID': lp.lpIdCode,

&#x20;     'Equipment': lp.assetName,

&#x20;     'Lubrication Date': lubricationDate,

&#x20;     'Technician': user.name,

&#x20;     'Quantity Used (L)': quantityUsedL,

&#x20;     'Oil Type Used': oilTypeUsed,

&#x20;     'Running Hours': params.runningHours === undefined || params.runningHours === null ? '' : Number(params.runningHours),

&#x20;     'Remarks': params.remarks || '',

&#x20;     'Status': 'PENDING\_APPROVAL',

&#x20;     'Submitted At': new Date(),

&#x20;     'Approved By': '',

&#x20;     'Approved At': '',

&#x20;     'Rejected Reason': '',

&#x20;     'Rejected At': '',

&#x20;     'Photo URL': params.photoUrl || '',

&#x20;     'Photo File ID': params.photoFileId || '',

&#x20;     'Legacy Import': 'No'

&#x20;   });

&#x20; });



&#x20; notify\_({

&#x20;   typeName: 'Pending Approval',

&#x20;   organizationId: lp.contractor,

&#x20;   message: user.name + ' submitted a lubrication record for ' + lp.lpIdCode + ' — awaiting approval.',

&#x20;   relatedEntityType: 'LubricationRecord',

&#x20;   relatedEntityId: id

&#x20; });



&#x20; if (quantityUsedL !== '' \&\& lp.standardQuantityL) {

&#x20;   var thresholdPct = parseFloat(getSettingValue\_('deviation.quantity\_threshold\_pct', '20'));

&#x20;   var deviationPct = Math.abs((quantityUsedL - lp.standardQuantityL) / lp.standardQuantityL) \* 100;

&#x20;   if (deviationPct > thresholdPct) {

&#x20;     notify\_({

&#x20;       typeName: 'Quantity Deviation', organizationId: lp.contractor,

&#x20;       message: lp.lpIdCode + ': submitted quantity ' + quantityUsedL + 'L deviates ' + deviationPct.toFixed(0) + '% from standard ' + lp.standardQuantityL + 'L.',

&#x20;       relatedEntityType: 'LubricationRecord', relatedEntityId: id

&#x20;     });

&#x20;   }

&#x20; }

&#x20; if (params.oilTypeUsedId \&\& lp.lubricantType \&\& params.oilTypeUsedId !== lp.lubricantType) {

&#x20;   notify\_({

&#x20;     typeName: 'Oil Type Changed', organizationId: lp.contractor,

&#x20;     message: lp.lpIdCode + ': oil type used differs from the standard lubricant type on file.',

&#x20;     relatedEntityType: 'LubricationRecord', relatedEntityId: id

&#x20;   });

&#x20; }



&#x20; return { record: { id: id, lpId: lp.lpIdCode, status: 'PENDING\_APPROVAL' } };

}



function api\_getPendingApprovals\_(params, user) {

&#x20; var points = getLpIndex\_();

&#x20; var pointByLpId = {};

&#x20; points.forEach(function (p) { pointByLpId\[p.lpIdCode] = p; });



&#x20; var orgId = user.dataScope !== 'ALL\_ORGS' ? user.organizationId : null;



&#x20; var rows = readRows\_(BOOK.OPERATIONAL, SHEETS.LUBRICATION\_HISTORY)

&#x20;   .filter(function (h) { return h\['Status'] === 'PENDING\_APPROVAL'; })

&#x20;   .filter(function (h) {

&#x20;     if (!orgId) return true;

&#x20;     var lp = pointByLpId\[h\['LP ID']];

&#x20;     return lp \&\& lp.contractor === orgId;

&#x20;   })

&#x20;   .sort(function (a, b) { return toDateOrNull\_(a\['Submitted At']) - toDateOrNull\_(b\['Submitted At']); });



&#x20; return {

&#x20;   records: rows.map(function (h) {

&#x20;     var lp = pointByLpId\[h\['LP ID']] || {};

&#x20;     return {

&#x20;       id: h\['Record ID'],

&#x20;       lpIdCode: h\['LP ID'],

&#x20;       equipment: lp.assetName || h\['Equipment'],

&#x20;       contractor: lp.contractor || null,

&#x20;       technician: h\['Technician'] || null,

&#x20;       lubricationDate: toIso\_(h\['Lubrication Date']),

&#x20;       quantityUsedL: h\['Quantity Used (L)'] === '' ? null : h\['Quantity Used (L)'],

&#x20;       oilType: h\['Oil Type Used'] || null,

&#x20;       remarks: h\['Remarks'] || null,

&#x20;       submittedAt: toIso\_(h\['Submitted At'])

&#x20;     };

&#x20;   }),

&#x20;   skipRequests: buildPendingSkipRequests\_(user, pointByLpId)

&#x20; };

}



function buildPendingSkipRequests\_(user, pointByLpId) {

&#x20; ensureRouteExecutionLogColumns\_();

&#x20; var orgId = user.dataScope !== 'ALL\_ORGS' ? user.organizationId : null;

&#x20; var logs = readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_EXECUTION\_LOG)

&#x20;   .filter(function (l) { return l\['Status'] === 'SKIP\_PENDING'; });

&#x20; var assignments = readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_ASSIGNMENTS);

&#x20; var routes = readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTES);

&#x20; var assignById = {};

&#x20; assignments.forEach(function (a) { assignById\[a\['Assignment ID']] = a; });

&#x20; var routeById = {};

&#x20; routes.forEach(function (r) { routeById\[r\['Route ID']] = r; });



&#x20; return logs.filter(function (l) {

&#x20;   var a = assignById\[l\['Assignment ID']];

&#x20;   if (!a) return false;

&#x20;   var route = routeById\[a\['Route ID']];

&#x20;   if (!route) return false;

&#x20;   if (orgId \&\& route\['Organization'] !== orgId) return false;

&#x20;   return true;

&#x20; }).sort(function (a, b) {

&#x20;   return toDateOrNull\_(a\['Skip Requested At']) - toDateOrNull\_(b\['Skip Requested At']);

&#x20; }).map(function (l) {

&#x20;   var a = assignById\[l\['Assignment ID']];

&#x20;   var route = routeById\[a\['Route ID']] || {};

&#x20;   var lp = pointByLpId\[l\['LP ID']] || {};

&#x20;   return {

&#x20;     id: l\['Assignment ID'] + '|' + l\['LP ID'],

&#x20;     assignmentId: l\['Assignment ID'],

&#x20;     lpId: l\['LP ID'],

&#x20;     lpIdCode: l\['LP ID'],

&#x20;     equipment: lp.assetName || '',

&#x20;     contractor: route\['Organization'] || null,

&#x20;     routeName: route\['Name'] || a\['Route ID'],

&#x20;     technician: a\['Technician'] || null,

&#x20;     reason: l\['Skip Reason'] || '',

&#x20;     comment: l\['Skip Comment'] || null,

&#x20;     requestedAt: toIso\_(l\['Skip Requested At']),

&#x20;     requestedBy: l\['Skip Requested By'] || null

&#x20;   };

&#x20; });

}



function api\_approveLubrication\_(params, user) {

&#x20; if (!user.capabilities.approve) throw apiError\_(403, 'Missing capability: approve');

&#x20; var id = params.id;

&#x20; var rows = readRows\_(BOOK.OPERATIONAL, SHEETS.LUBRICATION\_HISTORY);

&#x20; var record = rows.filter(function (r) { return r\['Record ID'] === id; })\[0];

&#x20; if (!record) throw apiError\_(404, 'Record not found.');

&#x20; if (record\['Status'] !== 'PENDING\_APPROVAL') throw apiError\_(400, 'Record is not pending approval.');



&#x20; var points = getLpIndex\_();

&#x20; var lp = points.filter(function (p) { return p.lpIdCode === record\['LP ID']; })\[0];

&#x20; var orgId = lp ? lp.contractor : null;

&#x20; if (user.dataScope !== 'ALL\_ORGS' \&\& orgId !== user.organizationId) {

&#x20;   throw apiError\_(403, "Not authorized for this organization's data.");

&#x20; }



&#x20; updateRowByKey\_(BOOK.OPERATIONAL, SHEETS.LUBRICATION\_HISTORY, 'Record ID', id, {

&#x20;   'Status': 'APPROVED', 'Approved By': user.name, 'Approved At': new Date()

&#x20; });

&#x20; // No separate lastChangeDateCache to update — getLpIndex\_() derives it

&#x20; // fresh from APPROVED history rows on every read.

&#x20; return { success: true };

}



function api\_rejectLubrication\_(params, user) {

&#x20; if (!user.capabilities.reject) throw apiError\_(403, 'Missing capability: reject');

&#x20; if (!params.reason) throw apiError\_(400, 'A rejection reason is required.');

&#x20; var id = params.id;

&#x20; var rows = readRows\_(BOOK.OPERATIONAL, SHEETS.LUBRICATION\_HISTORY);

&#x20; var record = rows.filter(function (r) { return r\['Record ID'] === id; })\[0];

&#x20; if (!record) throw apiError\_(404, 'Record not found.');

&#x20; if (record\['Status'] !== 'PENDING\_APPROVAL') throw apiError\_(400, 'Record is not pending approval.');



&#x20; var points = getLpIndex\_();

&#x20; var lp = points.filter(function (p) { return p.lpIdCode === record\['LP ID']; })\[0];

&#x20; var orgId = lp ? lp.contractor : null;

&#x20; if (user.dataScope !== 'ALL\_ORGS' \&\& orgId !== user.organizationId) {

&#x20;   throw apiError\_(403, "Not authorized for this organization's data.");

&#x20; }



&#x20; updateRowByKey\_(BOOK.OPERATIONAL, SHEETS.LUBRICATION\_HISTORY, 'Record ID', id, {

&#x20;   'Status': 'REJECTED', 'Rejected Reason': params.reason, 'Rejected At': new Date(), 'Approved By': user.name

&#x20; });



&#x20; var technicianName = record\['Technician'];

&#x20; if (technicianName) {

&#x20;   var techUser = readRows\_(BOOK.CONFIG, SHEETS.USERS).filter(function (u) { return u\['Name'] === technicianName; })\[0];

&#x20;   notify\_({

&#x20;     typeName: 'Rejected Record', organizationId: orgId,

&#x20;     message: 'Your submission for ' + record\['LP ID'] + ' was rejected: ' + params.reason,

&#x20;     relatedEntityType: 'LubricationRecord', relatedEntityId: id,

&#x20;     extraEmails: techUser ? \[techUser\['Email']] : \[]

&#x20;   });



&#x20;   var threshold = parseInt(getSettingValue\_('repeated\_rejection.threshold', '3'), 10);

&#x20;   var rejectionCount = readRows\_(BOOK.OPERATIONAL, SHEETS.LUBRICATION\_HISTORY)

&#x20;     .filter(function (r) { return r\['Technician'] === technicianName \&\& r\['Status'] === 'REJECTED'; }).length;

&#x20;   if (rejectionCount >= threshold) {

&#x20;     var actionType = readRows\_(BOOK.CONFIG, SHEETS.ACTION\_TYPES).filter(function (a) { return a\['Name'] === 'Repeated Rejection'; })\[0];

&#x20;     var engineer = orgId ? readRows\_(BOOK.CONFIG, SHEETS.USERS).filter(function (u) {

&#x20;       var titleRow = readRows\_(BOOK.CONFIG, SHEETS.TITLES).filter(function (t) { return t\['Title Name'] === u\['Title']; })\[0];

&#x20;       return titleRow \&\& titleRow\['Organization'] === orgId \&\& String(u\['Title']).indexOf('Engineer') !== -1;

&#x20;     })\[0] : null;

&#x20;     if (actionType \&\& lp) {

&#x20;       withScriptLock\_(function () {

&#x20;         var actId = nextSequentialId\_(BOOK.OPERATIONAL, SHEETS.ACTION\_PLANS, 'Action ID', 'ACT-', 5);

&#x20;         appendRowObj\_(BOOK.OPERATIONAL, SHEETS.ACTION\_PLANS, {

&#x20;           'Action ID': actId, 'Action Type': 'Repeated Rejection', 'Auto/Manual': 'auto',

&#x20;           'Equipment': lp.equipmentIdCode, 'LP IDs': lp.lpIdCode,

&#x20;           'Description': rejectionCount + ' rejected submissions for this technician — review training/process.',

&#x20;           'Priority': actionType\['Default Priority'], 'Owner': engineer ? engineer\['Name'] : '',

&#x20;           'Due Date': '', 'Status': 'OPEN', 'Created By': user.name, 'Created At': new Date(),

&#x20;           'Closed Date': '', 'Closure Comments': ''

&#x20;         });

&#x20;       });

&#x20;     }

&#x20;   }

&#x20; }



&#x20; return { success: true };

}



// ─────────────────────────────────────────────────────────────────────────

// API: ACTION PLANS

// ─────────────────────────────────────────────────────────────────────────



function api\_getActionPlans\_(params, user) {

&#x20; var points = getLpIndex\_();

&#x20; var orgId = user.dataScope !== 'ALL\_ORGS' ? user.organizationId : (params.contractor || null);



&#x20; var rows = readRows\_(BOOK.OPERATIONAL, SHEETS.ACTION\_PLANS);

&#x20; if (params.status) rows = rows.filter(function (r) { return r\['Status'] === params.status; });

&#x20; if (orgId) rows = rows.filter(function (r) { return actionPlanBelongsToOrg\_(points, r, orgId); });



&#x20; var actionTypes = readRows\_(BOOK.CONFIG, SHEETS.ACTION\_TYPES);

&#x20; var typeByName = {};

&#x20; actionTypes.forEach(function (t) { typeByName\[t\['Name']] = t; });

&#x20; var equipmentMap = getEquipmentMap\_();



&#x20; rows.sort(function (a, b) { return toDateOrNull\_(b\['Created At']) - toDateOrNull\_(a\['Created At']); });



&#x20; return {

&#x20;   actionPlans: rows.map(function (p) {

&#x20;     var equip = equipmentMap\[p\['Equipment']] || {};

&#x20;     var actionType = typeByName\[p\['Action Type']] || {};

&#x20;     return {

&#x20;       id: p\['Action ID'],

&#x20;       actionType: p\['Action Type'],

&#x20;       autoOrManual: p\['Auto/Manual'] || actionType\['Auto or Manual'],

&#x20;       equipment: equip\['Asset Name'] || p\['Equipment'],

&#x20;       equipmentCode: p\['Equipment'],

&#x20;       contractor: equip\['Contractor'] || null,

&#x20;       description: p\['Description'],

&#x20;       priority: p\['Priority'],

&#x20;       owner: p\['Owner'] || null,

&#x20;       dueDate: toIso\_(p\['Due Date']),

&#x20;       status: p\['Status'],

&#x20;       createdBy: p\['Created By'] || null,

&#x20;       createdAt: toIso\_(p\['Created At']),

&#x20;       closedDate: toIso\_(p\['Closed Date']),

&#x20;       closureComments: p\['Closure Comments'] || null

&#x20;     };

&#x20;   })

&#x20; };

}



function api\_createActionPlan\_(params, user) {

&#x20; if (!params.actionTypeName) throw apiError\_(400, 'actionTypeName is required.');

&#x20; if (!params.equipmentId) throw apiError\_(400, 'equipmentId is required.');

&#x20; if (!params.description) throw apiError\_(400, 'description is required.');



&#x20; var actionType = readRows\_(BOOK.CONFIG, SHEETS.ACTION\_TYPES).filter(function (a) { return a\['Name'] === params.actionTypeName; })\[0];

&#x20; if (!actionType) throw apiError\_(400, 'Unknown action type.');



&#x20; var id;

&#x20; withScriptLock\_(function () {

&#x20;   id = nextSequentialId\_(BOOK.OPERATIONAL, SHEETS.ACTION\_PLANS, 'Action ID', 'ACT-', 5);

&#x20;   appendRowObj\_(BOOK.OPERATIONAL, SHEETS.ACTION\_PLANS, {

&#x20;     'Action ID': id,

&#x20;     'Action Type': params.actionTypeName,

&#x20;     'Auto/Manual': actionType\['Auto or Manual'],

&#x20;     'Equipment': params.equipmentId,

&#x20;     'LP IDs': (params.lpIds || \[]).join(', '),

&#x20;     'Description': params.description,

&#x20;     'Priority': params.priority || actionType\['Default Priority'] || 'MEDIUM',

&#x20;     'Owner': params.ownerName || '',

&#x20;     'Due Date': params.dueDate ? new Date(params.dueDate) : '',

&#x20;     'Status': 'OPEN',

&#x20;     'Created By': user.name,

&#x20;     'Created At': new Date(),

&#x20;     'Closed Date': '',

&#x20;     'Closure Comments': ''

&#x20;   });

&#x20; });

&#x20; return { actionPlan: { id: id, status: 'OPEN' } };

}



function api\_closeActionPlan\_(params, user) {

&#x20; if (!user.capabilities.closeActions) throw apiError\_(403, 'Missing capability: closeActions');

&#x20; if (!params.closureComments) throw apiError\_(400, 'Closure comments are required.');



&#x20; var plan = readRows\_(BOOK.OPERATIONAL, SHEETS.ACTION\_PLANS).filter(function (p) { return p\['Action ID'] === params.id; })\[0];

&#x20; if (!plan) throw apiError\_(404, 'Action plan not found.');



&#x20; if (user.dataScope !== 'ALL\_ORGS') {

&#x20;   var equip = getEquipmentMap\_()\[plan\['Equipment']];

&#x20;   if (!equip || equip\['Contractor'] !== user.organizationId) throw apiError\_(403, "Not authorized for this organization's data.");

&#x20; }



&#x20; updateRowByKey\_(BOOK.OPERATIONAL, SHEETS.ACTION\_PLANS, 'Action ID', params.id, {

&#x20;   'Status': 'COMPLETED', 'Closed Date': new Date(), 'Closure Comments': params.closureComments

&#x20; });

&#x20; return { success: true };

}



function api\_updateActionPlanStatus\_(params, user) {

&#x20; var allowed = \['OPEN', 'IN\_PROGRESS', 'WAITING', 'CANCELLED'];

&#x20; if (allowed.indexOf(params.status) === -1) throw apiError\_(400, 'Invalid status.');

&#x20; var plan = readRows\_(BOOK.OPERATIONAL, SHEETS.ACTION\_PLANS).filter(function (p) { return p\['Action ID'] === params.id; })\[0];

&#x20; if (!plan) throw apiError\_(404, 'Action plan not found.');

&#x20; if (user.dataScope !== 'ALL\_ORGS') {

&#x20;   var equip = getEquipmentMap\_()\[plan\['Equipment']];

&#x20;   if (!equip || equip\['Contractor'] !== user.organizationId) throw apiError\_(403, "Not authorized for this organization's data.");

&#x20; }

&#x20; updateRowByKey\_(BOOK.OPERATIONAL, SHEETS.ACTION\_PLANS, 'Action ID', params.id, { 'Status': params.status });

&#x20; return { success: true };

}



// ─────────────────────────────────────────────────────────────────────────

// API: NOTIFICATIONS

// ─────────────────────────────────────────────────────────────────────────



function api\_getNotifications\_(params, user) {

&#x20; var rows = readRows\_(BOOK.OPERATIONAL, SHEETS.NOTIFICATIONS).filter(function (n) { return n\['User Email'] === user.email; });

&#x20; if (params.status) rows = rows.filter(function (n) { return n\['Status'] === params.status; });

&#x20; if (params.priority) rows = rows.filter(function (n) { return n\['Priority'] === params.priority; });

&#x20; rows.sort(function (a, b) { return toDateOrNull\_(b\['Created At']) - toDateOrNull\_(a\['Created At']); });



&#x20; var unreadCount = readRows\_(BOOK.OPERATIONAL, SHEETS.NOTIFICATIONS)

&#x20;   .filter(function (n) { return n\['User Email'] === user.email \&\& n\['Status'] === 'UNREAD'; }).length;



&#x20; return {

&#x20;   unreadCount: unreadCount,

&#x20;   notifications: rows.slice(0, 200).map(function (n) {

&#x20;     return {

&#x20;       id: n\['Notification ID'], type: n\['Type'], message: n\['Message'], priority: n\['Priority'], status: n\['Status'],

&#x20;       relatedEntityType: n\['Related Entity Type'] || null, relatedEntityId: n\['Related Entity ID'] || null,

&#x20;       createdAt: toIso\_(n\['Created At'])

&#x20;     };

&#x20;   })

&#x20; };

}



function api\_markNotificationRead\_(params, user) {

&#x20; var n = readRows\_(BOOK.OPERATIONAL, SHEETS.NOTIFICATIONS).filter(function (x) { return x\['Notification ID'] === params.id; })\[0];

&#x20; if (!n || n\['User Email'] !== user.email) throw apiError\_(404, 'Notification not found.');

&#x20; updateRowByKey\_(BOOK.OPERATIONAL, SHEETS.NOTIFICATIONS, 'Notification ID', params.id, { 'Status': 'READ' });

&#x20; return { success: true };

}



function api\_archiveNotification\_(params, user) {

&#x20; var n = readRows\_(BOOK.OPERATIONAL, SHEETS.NOTIFICATIONS).filter(function (x) { return x\['Notification ID'] === params.id; })\[0];

&#x20; if (!n || n\['User Email'] !== user.email) throw apiError\_(404, 'Notification not found.');

&#x20; updateRowByKey\_(BOOK.OPERATIONAL, SHEETS.NOTIFICATIONS, 'Notification ID', params.id, { 'Status': 'ARCHIVED' });

&#x20; return { success: true };

}



function api\_markAllNotificationsRead\_(params, user) {

&#x20; var sheet = getSheet\_(BOOK.OPERATIONAL, SHEETS.NOTIFICATIONS);

&#x20; var table = readTable\_(sheet);

&#x20; table.rows.forEach(function (n) {

&#x20;   if (n\['User Email'] === user.email \&\& n\['Status'] === 'UNREAD') {

&#x20;     var colIdx = table.headers.indexOf('Status');

&#x20;     sheet.getRange(n.\_\_row, colIdx + 1).setValue('READ');

&#x20;   }

&#x20; });

&#x20; SpreadsheetApp.flush();

&#x20; return { success: true };

}



// ─────────────────────────────────────────────────────────────────────────

// API: TIMELINE — multi-source event feed (Section 12.6).

// Sources: Lubrication History (submitted/approved/rejected), Action Plans

// (overdue-flagged/oil-sample-overdue-flagged/created/closed), Oil Samples

// (completed), Audit Log (ACC data edits). Merged, sorted desc, capped 300.

// ─────────────────────────────────────────────────────────────────────────



function api\_getTimeline\_(params, user) {

&#x20; var fromDate = params.from ? new Date(params.from) : new Date(Date.now() - 30 \* 86400000);

&#x20; var toDate = params.to ? new Date(params.to + 'T23:59:59') : new Date();

&#x20; var orgId = user.dataScope === 'ALL\_ORGS' ? (params.contractor || null) : (user.organizationId || '\_\_none\_\_');

&#x20; var wantsType = function (t) { return !params.eventType || params.eventType === t; };

&#x20; var inRange = function (d) { return d \&\& d >= fromDate \&\& d <= toDate; };



&#x20; var points = getLpIndex\_();

&#x20; var pointByLpId = {}; points.forEach(function (p) { pointByLpId\[p.lpIdCode] = p; });

&#x20; var equipmentMap = getEquipmentMap\_();



&#x20; function equipmentInScope(equipmentCode) {

&#x20;   var equip = equipmentMap\[equipmentCode];

&#x20;   if (!equip) return !orgId;

&#x20;   if (orgId \&\& equip\['Contractor'] !== orgId) return false;

&#x20;   if (params.equipment \&\& equipmentCode !== params.equipment) return false;

&#x20;   return true;

&#x20; }



&#x20; var events = \[];



&#x20; // 1/2/3 — lubrication submitted / approved / rejected

&#x20; if (wantsType('LUBRICATION\_COMPLETED') || wantsType('APPROVED') || wantsType('REJECTED')) {

&#x20;   readRows\_(BOOK.OPERATIONAL, SHEETS.LUBRICATION\_HISTORY).forEach(function (r) {

&#x20;     var lp = pointByLpId\[r\['LP ID']];

&#x20;     if (!lp || !equipmentInScope(lp.equipmentIdCode)) return;

&#x20;     var base = { lpId: lp.lpIdCode, lpIdCode: lp.lpIdCode, equipmentId: lp.equipmentIdCode, equipmentName: lp.assetName, areaName: lp.areaName, contractor: lp.contractor };

&#x20;     var submittedAt = toDateOrNull\_(r\['Submitted At']);

&#x20;     var approvedAt = toDateOrNull\_(r\['Approved At']);

&#x20;     var rejectedAt = toDateOrNull\_(r\['Rejected At']);

&#x20;     if (wantsType('LUBRICATION\_COMPLETED') \&\& inRange(submittedAt) \&\& (!params.technician || r\['Technician'] === params.technician)) {

&#x20;       events.push(Object.assign({}, base, { id: 'lr-sub-' + r\['Record ID'], timestamp: submittedAt, eventType: 'LUBRICATION\_COMPLETED', actor: r\['Technician'] || null, actorId: r\['Technician'] || null, detail: 'Lubrication submitted' + (r\['Quantity Used (L)'] ? ' (' + r\['Quantity Used (L)'] + ' L)' : '') }));

&#x20;     }

&#x20;     if (wantsType('APPROVED') \&\& r\['Status'] === 'APPROVED' \&\& inRange(approvedAt) \&\& (!params.technician || r\['Approved By'] === params.technician)) {

&#x20;       events.push(Object.assign({}, base, { id: 'lr-app-' + r\['Record ID'], timestamp: approvedAt, eventType: 'APPROVED', actor: r\['Approved By'] || null, actorId: r\['Approved By'] || null, detail: 'Submission approved' }));

&#x20;     }

&#x20;     if (wantsType('REJECTED') \&\& r\['Status'] === 'REJECTED' \&\& inRange(rejectedAt) \&\& (!params.technician || r\['Approved By'] === params.technician)) {

&#x20;       events.push(Object.assign({}, base, { id: 'lr-rej-' + r\['Record ID'], timestamp: rejectedAt, eventType: 'REJECTED', actor: r\['Approved By'] || null, actorId: r\['Approved By'] || null, detail: r\['Rejected Reason'] || 'Submission rejected' }));

&#x20;     }

&#x20;   });

&#x20; }



&#x20; // 4/6/7/8 — overdue flagged / oil-sample-overdue flagged / action created / action closed

&#x20; if (wantsType('OVERDUE\_FLAGGED') || wantsType('OIL\_SAMPLE\_OVERDUE\_FLAGGED') || wantsType('ACTION\_CREATED') || wantsType('ACTION\_CLOSED')) {

&#x20;   readRows\_(BOOK.OPERATIONAL, SHEETS.ACTION\_PLANS).forEach(function (p) {

&#x20;     if (!equipmentInScope(p\['Equipment'])) return;

&#x20;     var equip = equipmentMap\[p\['Equipment']] || {};

&#x20;     var base = { lpId: null, lpIdCode: null, equipmentId: p\['Equipment'], equipmentName: equip\['Asset Name'] || p\['Equipment'], areaName: equip\['Area'] || null, contractor: equip\['Contractor'] || null };

&#x20;     var createdAt = toDateOrNull\_(p\['Created At']);

&#x20;     var closedDate = toDateOrNull\_(p\['Closed Date']);

&#x20;     var isOverdueType = p\['Action Type'] === 'Overdue Lubrication';

&#x20;     var isOaType = p\['Action Type'] === 'Oil Sample Overdue';

&#x20;     if (inRange(createdAt)) {

&#x20;       if (wantsType('OVERDUE\_FLAGGED') \&\& isOverdueType) events.push(Object.assign({}, base, { id: 'ap-flag-' + p\['Action ID'], timestamp: createdAt, eventType: 'OVERDUE\_FLAGGED', actor: 'System', actorId: null, detail: p\['Description'] }));

&#x20;       if (wantsType('OIL\_SAMPLE\_OVERDUE\_FLAGGED') \&\& isOaType) events.push(Object.assign({}, base, { id: 'ap-oaflag-' + p\['Action ID'], timestamp: createdAt, eventType: 'OIL\_SAMPLE\_OVERDUE\_FLAGGED', actor: 'System', actorId: null, detail: p\['Description'] }));

&#x20;       if (wantsType('ACTION\_CREATED') \&\& p\['Auto/Manual'] === 'manual' \&\& (!params.technician || p\['Created By'] === params.technician)) events.push(Object.assign({}, base, { id: 'ap-create-' + p\['Action ID'], timestamp: createdAt, eventType: 'ACTION\_CREATED', actor: p\['Created By'] || null, actorId: p\['Created By'] || null, detail: p\['Action Type'] + ': ' + p\['Description'] }));

&#x20;     }

&#x20;     if (wantsType('ACTION\_CLOSED') \&\& inRange(closedDate)) {

&#x20;       events.push(Object.assign({}, base, { id: 'ap-close-' + p\['Action ID'], timestamp: closedDate, eventType: 'ACTION\_CLOSED', actor: null, actorId: null, detail: p\['Closure Comments'] || (p\['Action Type'] + ' closed') }));

&#x20;     }

&#x20;   });

&#x20; }



&#x20; // 5 — oil sample completed

&#x20; if (wantsType('OIL\_SAMPLE\_COMPLETED')) {

&#x20;   readRows\_(BOOK.OPERATIONAL, SHEETS.OIL\_SAMPLES).forEach(function (s) {

&#x20;     var lp = pointByLpId\[s\['LP ID']];

&#x20;     if (!lp || !equipmentInScope(lp.equipmentIdCode)) return;

&#x20;     var uploadedAt = toDateOrNull\_(s\['Uploaded At']);

&#x20;     if (!inRange(uploadedAt)) return;

&#x20;     if (params.technician \&\& s\['Uploaded By'] !== params.technician) return;

&#x20;     events.push({ id: 'os-' + s\['Lab Sample ID'], timestamp: uploadedAt, eventType: 'OIL\_SAMPLE\_COMPLETED', lpId: lp.lpIdCode, lpIdCode: lp.lpIdCode, equipmentId: lp.equipmentIdCode, equipmentName: lp.assetName, areaName: lp.areaName, contractor: lp.contractor, actor: s\['Uploaded By'] || null, actorId: s\['Uploaded By'] || null, detail: 'Oil sample recorded — ' + s\['Report Status'] });

&#x20;   });

&#x20; }



&#x20; // 9 — ACC data edit (from Audit Log)

&#x20; if (wantsType('ACC\_DATA\_EDIT')) {

&#x20;   readRows\_(BOOK.OPERATIONAL, SHEETS.AUDIT\_LOG).forEach(function (e) {

&#x20;     if (e\['Action Category'] !== 'DATA\_EDIT' || e\['Entity Type'] !== 'LubricationPoint') return;

&#x20;     var ts = toDateOrNull\_(e\['Timestamp']);

&#x20;     if (!inRange(ts)) return;

&#x20;     if (orgId \&\& e\['Visible To Org'] !== orgId) return;

&#x20;     if (params.technician \&\& e\['Actor Email'] !== params.technician) return;

&#x20;     var lp = pointByLpId\[e\['Entity ID']];

&#x20;     if (params.equipment \&\& (!lp || lp.equipmentIdCode !== params.equipment)) return;

&#x20;     events.push({ id: 'audit-' + e\['Log ID'], timestamp: ts, eventType: 'ACC\_DATA\_EDIT', lpId: e\['Entity ID'], lpIdCode: lp ? lp.lpIdCode : null, equipmentId: lp ? lp.equipmentIdCode : null, equipmentName: lp ? lp.assetName : null, areaName: lp ? lp.areaName : null, contractor: lp ? lp.contractor : null, actor: e\['Actor Email'], actorId: e\['Actor Email'], detail: e\['Reason'] || 'Data corrected' });

&#x20;   });

&#x20; }



&#x20; var filtered = params.area ? events.filter(function (e) { return e.areaName === params.area; }) : events;

&#x20; filtered.sort(function (a, b) { return (b.timestamp || 0) - (a.timestamp || 0); });

&#x20; filtered = filtered.slice(0, 300).map(function (e) { return Object.assign({}, e, { timestamp: toIso\_(e.timestamp) }); });



&#x20; return { events: filtered };

}



// ─────────────────────────────────────────────────────────────────────────

// API: SETTINGS (general key/value + permission templates + notification routing)

// ─────────────────────────────────────────────────────────────────────────



function api\_getSettings\_(params, user) {

&#x20; var rows = readRows\_(BOOK.CONFIG, SHEETS.GENERAL\_SETTINGS);

&#x20; return {

&#x20;   settings: rows.map(function (r) { return { key: r\['Key'], value: r\['Value'] === null ? '' : String(r\['Value']), editableBy: r\['Editable By'] || null }; })

&#x20; };

}



function api\_updateSetting\_(params, user) {

&#x20; if (!user.capabilities.manageSettings) throw apiError\_(403, 'Missing capability: manageSettings');

&#x20; if (params.value === undefined) throw apiError\_(400, 'value is required.');

&#x20; var updatedRow = updateRowByKey\_(BOOK.CONFIG, SHEETS.GENERAL\_SETTINGS, 'Key', params.key, { 'Value': params.value });

&#x20; if (!updatedRow) throw apiError\_(404, 'Setting not found: ' + params.key);

&#x20; writeAuditLog\_({ actorEmail: user.email, actionCategory: 'PERMISSION\_CHANGE', entityType: 'Setting', entityId: params.key, afterValue: { value: params.value }, reason: 'Settings update' });

&#x20; return { setting: { key: params.key, value: params.value } };

}



function api\_getPermissionTemplates\_(params, user) {

&#x20; if (!user.capabilities.managePermissions) throw apiError\_(403, 'Missing capability: managePermissions');

&#x20; var sheet = getSheet\_(BOOK.CONFIG, SHEETS.PERMISSION\_TEMPLATES);

&#x20; var table = readTable\_(sheet);

&#x20; var titles = readRows\_(BOOK.CONFIG, SHEETS.TITLES);



&#x20; return {

&#x20;   templates: table.rows.map(function (row) {

&#x20;     var screenAccess = {}, capabilities = {};

&#x20;     table.headers.forEach(function (h) {

&#x20;       if (!h) return;

&#x20;       if (h.indexOf('Screen:') === 0) screenAccess\[screenKeyFromHeader\_(h)] = boolFromYesNo\_(row\[h]);

&#x20;       else if (h.indexOf('Can:') === 0) capabilities\[capabilityKeyFromHeader\_(h)] = boolFromYesNo\_(row\[h]);

&#x20;     });

&#x20;     var titleNames = titles.filter(function (t) { return t\['Permission Template'] === row\['Title']; }).map(function (t) { return t\['Title Name']; });

&#x20;     return { id: row\['Title'], name: row\['Title'], dataScope: row\['Data Scope'], screenAccess: screenAccess, capabilities: capabilities, titles: titleNames };

&#x20;   })

&#x20; };

}



function api\_updatePermissionTemplate\_(params, user) {

&#x20; if (!user.capabilities.managePermissions) throw apiError\_(403, 'Missing capability: managePermissions');

&#x20; var sheet = getSheet\_(BOOK.CONFIG, SHEETS.PERMISSION\_TEMPLATES);

&#x20; var table = readTable\_(sheet);

&#x20; var before = table.rows.filter(function (r) { return r\['Title'] === params.id; })\[0];

&#x20; if (!before) throw apiError\_(404, 'Permission template not found.');



&#x20; var updates = {};

&#x20; if (params.dataScope) updates\['Data Scope'] = params.dataScope;

&#x20; if (params.screenAccess) {

&#x20;   table.headers.forEach(function (h) {

&#x20;     if (h \&\& h.indexOf('Screen:') === 0) {

&#x20;       var key = screenKeyFromHeader\_(h);

&#x20;       if (params.screenAccess.hasOwnProperty(key)) updates\[h] = yesNo\_(params.screenAccess\[key]);

&#x20;     }

&#x20;   });

&#x20; }

&#x20; if (params.capabilities) {

&#x20;   table.headers.forEach(function (h) {

&#x20;     if (h \&\& h.indexOf('Can:') === 0) {

&#x20;       var key = capabilityKeyFromHeader\_(h);

&#x20;       if (params.capabilities.hasOwnProperty(key)) updates\[h] = yesNo\_(params.capabilities\[key]);

&#x20;     }

&#x20;   });

&#x20; }



&#x20; updateRowByKey\_(BOOK.CONFIG, SHEETS.PERMISSION\_TEMPLATES, 'Title', params.id, updates);

&#x20; writeAuditLog\_({ actorEmail: user.email, actionCategory: 'PERMISSION\_CHANGE', entityType: 'PermissionTemplate', entityId: params.id, beforeValue: before, afterValue: updates, reason: 'Permission template "' + params.id + '" updated' });



&#x20; return { template: api\_getPermissionTemplates\_({}, user).templates.filter(function (t) { return t.id === params.id; })\[0] };

}



function api\_getNotificationRouting\_(params, user) {

&#x20; if (!user.capabilities.manageNotificationRouting) throw apiError\_(403, 'Missing capability: manageNotificationRouting');

&#x20; var rows = readRows\_(BOOK.CONFIG, SHEETS.NOTIFICATION\_TYPES);

&#x20; return {

&#x20;   types: rows.map(function (r) {

&#x20;     var tokens = String(r\['Recipients'] || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);

&#x20;     var channels = String(r\['Channels'] || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);

&#x20;     return { id: r\['Name'], name: r\['Name'], defaultPriority: r\['Default Priority'], rule: { id: r\['Name'], recipientTokens: tokens, channels: channels } };

&#x20;   })

&#x20; };

}



function api\_updateNotificationRouting\_(params, user) {

&#x20; if (!user.capabilities.manageNotificationRouting) throw apiError\_(403, 'Missing capability: manageNotificationRouting');

&#x20; var ruleId = String(params.ruleId || params.id || '').trim();

&#x20; if (!ruleId) throw apiError\_(400, 'ruleId is required.');

&#x20; var updates = {};

&#x20; if (params.recipientTokens) updates\['Recipients'] = params.recipientTokens.join(', ');

&#x20; if (params.channels) updates\['Channels'] = params.channels.join(', ');

&#x20; if (!Object.keys(updates).length) throw apiError\_(400, 'No updates provided.');

&#x20; var updatedRow = updateRowByKey\_(BOOK.CONFIG, SHEETS.NOTIFICATION\_TYPES, 'Name', ruleId, updates);

&#x20; if (!updatedRow) throw apiError\_(404, 'Notification type not found: ' + ruleId);

&#x20; writeAuditLog\_({ actorEmail: user.email, actionCategory: 'NOTIFICATION\_RULE\_CHANGE', entityType: 'NotificationRoutingRule', entityId: ruleId, afterValue: updates, reason: 'Notification routing rule updated' });

&#x20; return { rule: { id: ruleId, recipientTokens: params.recipientTokens || \[], channels: params.channels || \[] } };

}



// ─────────────────────────────────────────────────────────────────────────

// API: REPORTS — dispatches on params.report

// ─────────────────────────────────────────────────────────────────────────



function api\_getReportsData\_(params, user) {

&#x20; var report = params.report;

&#x20; var orgId = user.dataScope === 'ALL\_ORGS' ? (params.contractor || null) : (user.organizationId || '\_\_none\_\_');



&#x20; if (report === 'compliance') {

&#x20;   var points = filterLpByOrg\_(getLpIndex\_(), orgId);

&#x20;   var overall = computeComplianceStats\_(points.map(lpStatusInput\_));

&#x20;   var byArea = {};

&#x20;   points.forEach(function (p) { var a = p.areaName || 'Unassigned'; (byArea\[a] = byArea\[a] || \[]).push(p); });

&#x20;   var rows = Object.keys(byArea).map(function (area) {

&#x20;     var stats = computeComplianceStats\_(byArea\[area].map(lpStatusInput\_));

&#x20;     return { area: area, totalCalendarPoints: stats.totalCalendarPoints, overdue: stats.overdue, compliancePct: stats.compliancePct };

&#x20;   });

&#x20;   return { overall: overall, byArea: rows };

&#x20; }



&#x20; if (report === 'overdue') {

&#x20;   var points2 = filterLpByOrg\_(getLpIndex\_(), orgId);

&#x20;   var rows2 = points2.map(function (p) { return { p: p, status: computeLubricationStatus\_(lpStatusInput\_(p)) }; })

&#x20;     .filter(function (x) { return x.status.bucket === 'OVERDUE'; })

&#x20;     .map(function (x) {

&#x20;       return { lpIdCode: x.p.lpIdCode, equipment: x.p.assetName, area: x.p.areaName || '', contractor: x.p.contractor || '', daysOverdue: x.status.daysToDue != null ? Math.abs(x.status.daysToDue) : null, nextDue: toIso\_(x.status.nextDue) };

&#x20;     })

&#x20;     .sort(function (a, b) { return (b.daysOverdue || 0) - (a.daysOverdue || 0); });

&#x20;   return { rows: rows2 };

&#x20; }



&#x20; if (report === 'oil-samples') {

&#x20;   var points3 = filterLpByOrg\_(getLpIndex\_(), orgId).filter(function (p) { return p.oaRequired; });

&#x20;   var wantDue = params.status === 'due';

&#x20;   var rows3 = points3.map(function (p) { return { p: p, status: computeOilAnalysisStatus\_(lpStatusInput\_(p)) }; })

&#x20;     .filter(function (x) { return wantDue ? (x.status.bucket === 'DUE\_THIS\_MONTH' || x.status.bucket === 'DUE\_THIS\_WEEK') : x.status.bucket === 'OVERDUE'; })

&#x20;     .map(function (x) { return { lpIdCode: x.p.lpIdCode, equipment: x.p.assetName, contractor: x.p.contractor || '', lastSample: toIso\_(x.p.oaLastSampleDate), nextDue: toIso\_(x.status.nextDue) }; });

&#x20;   return { rows: rows3 };

&#x20; }



&#x20; if (report === 'route-completion') {

&#x20;   var assignmentWhere = orgId; // Routes carry an Organization column directly

&#x20;   var routes = readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTES);

&#x20;   var routeById = {}; routes.forEach(function (r) { routeById\[r\['Route ID']] = r; });

&#x20;   var execLogs = readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_EXECUTION\_LOG);

&#x20;   var assignments = readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_ASSIGNMENTS).filter(function (a) {

&#x20;     var route = routeById\[a\['Route ID']];

&#x20;     if (!route) return false;

&#x20;     if (assignmentWhere \&\& route\['Organization'] !== assignmentWhere) return false;

&#x20;     return true;

&#x20;   }).sort(function (a, b) { return toDateOrNull\_(b\['Assigned Date']) - toDateOrNull\_(a\['Assigned Date']); });



&#x20;   var rows4 = assignments.map(function (a) {

&#x20;     var logs = execLogs.filter(function (l) { return l\['Assignment ID'] === a\['Assignment ID']; });

&#x20;     var done = logs.filter(function (l) { return l\['Status'] === 'DONE'; }).length;

&#x20;     var skipped = logs.filter(function (l) { return isExecPointSkippedKpi\_(l\['Status']); }).length;

&#x20;     var route = routeById\[a\['Route ID']] || {};

&#x20;     return { route: route\['Name'] || a\['Route ID'], technician: a\['Technician'], assignedDate: toIso\_(a\['Assigned Date']), status: a\['Status'], totalPoints: logs.length, done: done, skipped: skipped, completionPct: logs.length ? Math.round((done / logs.length) \* 100) : 0 };

&#x20;   });

&#x20;   return { rows: rows4 };

&#x20; }



&#x20; if (report === 'action-plans') {

&#x20;   var points5 = getLpIndex\_();

&#x20;   var equipmentMap5 = getEquipmentMap\_();

&#x20;   var rows5 = readRows\_(BOOK.OPERATIONAL, SHEETS.ACTION\_PLANS)

&#x20;     .filter(function (p) { return !orgId || actionPlanBelongsToOrg\_(points5, p, orgId); })

&#x20;     .filter(function (p) { return !params.status || p\['Status'] === params.status; })

&#x20;     .map(function (p) {

&#x20;       var equip = equipmentMap5\[p\['Equipment']] || {};

&#x20;       return { actionType: p\['Action Type'], equipment: equip\['Asset Name'] || p\['Equipment'], contractor: equip\['Contractor'] || '', description: p\['Description'], priority: p\['Priority'], status: p\['Status'], owner: p\['Owner'] || '', dueDate: toIso\_(p\['Due Date']), createdAt: toIso\_(p\['Created At']), closedDate: toIso\_(p\['Closed Date']) };

&#x20;     });

&#x20;   return { rows: rows5 };

&#x20; }



&#x20; if (report === 'contractor-comparison') {

&#x20;   if (user.dataScope !== 'ALL\_ORGS') throw apiError\_(403, 'ACC/Super Admin only.');

&#x20;   var orgs = readRows\_(BOOK.CONFIG, SHEETS.ORGANIZATIONS).filter(function (o) { return o\['Type'] === 'contractor'; });

&#x20;   var allPoints = getLpIndex\_();

&#x20;   var rows6 = orgs.map(function (org) {

&#x20;     var pts = filterLpByOrg\_(allPoints, org\['Name']);

&#x20;     var stats = computeComplianceStats\_(pts.map(lpStatusInput\_));

&#x20;     return { contractor: org\['Name'], totalPoints: pts.length, overdue: stats.overdue, compliancePct: stats.compliancePct };

&#x20;   });

&#x20;   return { rows: rows6 };

&#x20; }



&#x20; throw apiError\_(400, 'Unknown report: ' + report);

}



// ─────────────────────────────────────────────────────────────────────────

// API: LOOKUPS — dispatches on params.type

// ─────────────────────────────────────────────────────────────────────────



function api\_getLookups\_(params, user) {

&#x20; var type = params.type;



&#x20; if (type === 'organizations') {

&#x20;   return { organizations: readRows\_(BOOK.CONFIG, SHEETS.ORGANIZATIONS).map(function (o) { return { id: o\['Name'], name: o\['Name'], type: o\['Type'] }; }) };

&#x20; }



&#x20; if (type === 'areas') {

&#x20;   var areas = readRows\_(BOOK.CONFIG, SHEETS.AREAS);

&#x20;   if (user.dataScope !== 'ALL\_ORGS') {

&#x20;     areas = areas.filter(function (a) { return a\['Contractor'] === user.organizationId; });

&#x20;   } else if (params.contractor) {

&#x20;     areas = areas.filter(function (a) { return a\['Contractor'] === params.contractor; });

&#x20;   }

&#x20;   return { areas: areas.map(function (a) { return { id: a\['Area Name'], name: a\['Area Name'], locnCode: a\['Location Code'], organization: a\['Contractor'] }; }) };

&#x20; }



&#x20; if (type === 'equipment') {

&#x20;   var equipment = readRows\_(BOOK.CONFIG, SHEETS.EQUIPMENT);

&#x20;   if (user.dataScope !== 'ALL\_ORGS') {

&#x20;     equipment = equipment.filter(function (e) { return e\['Contractor'] === user.organizationId; });

&#x20;   } else if (params.contractor) {

&#x20;     equipment = equipment.filter(function (e) { return e\['Contractor'] === params.contractor; });

&#x20;   }

&#x20;   if (params.area) {

&#x20;     equipment = equipment.filter(function (e) { return e\['Area'] === params.area; });

&#x20;   }

&#x20;   if (params.routeType) {

&#x20;     var lpIndex = filterLpByOrg\_(getLpIndex\_(), user.dataScope !== 'ALL\_ORGS' ? user.organizationId : (params.contractor || null));

&#x20;     var rt = String(params.routeType);

&#x20;     equipment = equipment.filter(function (e) {

&#x20;       var code = e\['Equipment Code'];

&#x20;       var eps = lpIndex.filter(function (p) { return p.equipmentIdCode === code; });

&#x20;       if (rt === 'Sampling') return eps.some(function (p) { return p.oaRequired; });

&#x20;       return eps.some(function (p) { return !p.oaRequired || String(p.frequencyType).toLowerCase() !== 'as\_needed'; });

&#x20;     });

&#x20;   }

&#x20;   return { equipment: equipment.map(function (e) { return { id: e\['Equipment Code'], code: e\['Equipment Code'], name: e\['Asset Name'], area: e\['Area'] || null, contractor: e\['Contractor'] || null }; }) };

&#x20; }



&#x20; if (type === 'lubricant-types') {

&#x20;   return { lubricantTypes: readRows\_(BOOK.CONFIG, SHEETS.LUBRICANT\_TYPES).map(function (l) { return { id: l\['Name'], name: l\['Name'], brand: l\['Brand'] || null }; }) };

&#x20; }



&#x20; if (type === 'technicians') {

&#x20;   var users = readRows\_(BOOK.CONFIG, SHEETS.USERS).filter(function (u) { return String(u\['Title'] || '').indexOf('Technician') !== -1; });

&#x20;   var titles = readRows\_(BOOK.CONFIG, SHEETS.TITLES);

&#x20;   var orgByTitle = {}; titles.forEach(function (t) { orgByTitle\[t\['Title Name']] = t\['Organization']; });

&#x20;   if (user.dataScope !== 'ALL\_ORGS') {

&#x20;     users = users.filter(function (u) { return orgByTitle\[u\['Title']] === user.organizationId; });

&#x20;   } else if (params.contractor) {

&#x20;     users = users.filter(function (u) { return orgByTitle\[u\['Title']] === params.contractor; });

&#x20;   }

&#x20;   return { technicians: users.map(function (u) { return { id: u\['Email'], name: u\['Name'] }; }) };

&#x20; }



&#x20; throw apiError\_(400, 'Unknown lookup type: ' + type);

}



// ─────────────────────────────────────────────────────────────────────────

// API: USERS \& TITLES (Settings screen — user administration)

// ─────────────────────────────────────────────────────────────────────────



function api\_getUsers\_(params, user) {

&#x20; requireScreen\_(user, 'settings');

&#x20; var users = readRows\_(BOOK.CONFIG, SHEETS.USERS);

&#x20; var titles = readRows\_(BOOK.CONFIG, SHEETS.TITLES);

&#x20; var orgByTitle = {}; titles.forEach(function (t) { orgByTitle\[t\['Title Name']] = t\['Organization']; });



&#x20; var seeAll = user.dataScope === 'ALL\_ORGS' \&\& user.titleName === 'Super Admin';

&#x20; if (!seeAll) users = users.filter(function (u) { return orgByTitle\[u\['Title']] === user.organizationId; });



&#x20; return {

&#x20;   users: users.map(function (u) {

&#x20;     var org = orgByTitle\[u\['Title']];

&#x20;     return { id: u\['Email'], name: u\['Name'], email: u\['Email'], title: u\['Title'] || null, organization: org === '(all orgs)' ? null : org, active: boolFromYesNo\_(u\['Active']), mustChangePassword: boolFromYesNo\_(u\['Must Change Password']) };

&#x20;   })

&#x20; };

}



function api\_getTitles\_(params, user) {

&#x20; requireScreen\_(user, 'settings');

&#x20; var titles = readRows\_(BOOK.CONFIG, SHEETS.TITLES);

&#x20; var seeAll = user.dataScope === 'ALL\_ORGS' \&\& user.titleName === 'Super Admin';

&#x20; if (!seeAll) titles = titles.filter(function (t) { return t\['Organization'] === user.organizationId; });

&#x20; return { titles: titles.map(function (t) { return { id: t\['Title Name'], name: t\['Title Name'], organization: t\['Organization'] === '(all orgs)' ? null : t\['Organization'] }; }) };

}



function api\_createUser\_(params, user) {

&#x20; requireScreen\_(user, 'settings');

&#x20; if (!user.capabilities.manageUsers) throw apiError\_(403, 'Missing capability: manageUsers');

&#x20; if (!params.name || !params.email || !params.titleId) throw apiError\_(400, 'name, email, and titleId are required.');



&#x20; if (user.titleName !== 'Super Admin' \&\& params.organizationId !== user.organizationId) {

&#x20;   throw apiError\_(403, 'You can only create users within your own organization.');

&#x20; }

&#x20; if (findUserRowByEmail\_(params.email)) throw apiError\_(400, 'A user with this email already exists.');



&#x20; var tempPassword = Math.random().toString(36).slice(-10) + 'A1!';

&#x20; var salt = makeSalt\_();

&#x20; var hash = hashPassword\_(tempPassword, salt);



&#x20; appendRowObj\_(BOOK.CONFIG, SHEETS.USERS, {

&#x20;   'Email': params.email, 'Name': params.name, 'Title': params.titleId,

&#x20;   'Organization': params.organizationId || '', 'Active': 'Yes', 'Must Change Password': 'Yes',

&#x20;   'Password Hash': hash, 'Password Salt': salt

&#x20; });



&#x20; return { user: { id: params.email, name: params.name, email: params.email }, temporaryPassword: tempPassword };

}



function api\_updateUserActive\_(params, user) {

&#x20; requireScreen\_(user, 'settings');

&#x20; if (!user.capabilities.manageUsers) throw apiError\_(403, 'Missing capability: manageUsers');

&#x20; var target = findUserRowByEmail\_(params.id);

&#x20; if (!target) throw apiError\_(404, 'User not found.');

&#x20; if (user.titleName !== 'Super Admin') {

&#x20;   var titles = readRows\_(BOOK.CONFIG, SHEETS.TITLES);

&#x20;   var orgByTitle = {}; titles.forEach(function (t) { orgByTitle\[t\['Title Name']] = t\['Organization']; });

&#x20;   if (orgByTitle\[target\['Title']] !== user.organizationId) throw apiError\_(403, "Not authorized for this organization's users.");

&#x20; }

&#x20; updateRowByKey\_(BOOK.CONFIG, SHEETS.USERS, 'Email', params.id, { 'Active': yesNo\_(!!params.active) });

&#x20; return { success: true };

}



// ─────────────────────────────────────────────────────────────────────────

// API: AUDIT LOG

// ─────────────────────────────────────────────────────────────────────────



function api\_getAuditLog\_(params, user) {

&#x20; var rows = readRows\_(BOOK.OPERATIONAL, SHEETS.AUDIT\_LOG);

&#x20; if (!user.capabilities.viewAuditLog) rows = rows.filter(function (r) { return r\['Visible To Org'] === user.organizationId; });

&#x20; rows.sort(function (a, b) { return toDateOrNull\_(b\['Timestamp']) - toDateOrNull\_(a\['Timestamp']); });

&#x20; return {

&#x20;   entries: rows.slice(0, 500).map(function (e) {

&#x20;     return { id: e\['Log ID'], actor: e\['Actor Email'], actionCategory: e\['Action Category'], entityType: e\['Entity Type'], entityId: e\['Entity ID'], before: e\['Before Value'] || null, after: e\['After Value'] || null, reason: e\['Reason'] || null, timestamp: toIso\_(e\['Timestamp']) };

&#x20;   })

&#x20; };

}



// ─────────────────────────────────────────────────────────────────────────

// API: OIL MANAGEMENT CENTER (consumption / forecast / purchase log)

// ─────────────────────────────────────────────────────────────────────────



function api\_getOilConsumption\_(params, user) {

&#x20; requireScreen\_(user, 'oil\_management\_center');

&#x20; var orgId = user.dataScope === 'ALL\_ORGS' ? (params.contractor || null) : (user.organizationId || '\_\_none\_\_');

&#x20; var fromDate = params.from ? new Date(params.from) : new Date(new Date().getFullYear(), 0, 1);

&#x20; var toDate = params.to ? new Date(params.to) : new Date();

&#x20; var rangeDays = Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / 86400000));

&#x20; var groupBy = params.groupBy || 'lubricant';



&#x20; var points = filterLpByOrg\_(getLpIndex\_(), orgId);

&#x20; var pointByLpId = {}; points.forEach(function (p) { pointByLpId\[p.lpIdCode] = p; });



&#x20; var records = readRows\_(BOOK.OPERATIONAL, SHEETS.LUBRICATION\_HISTORY).filter(function (r) {

&#x20;   if (r\['Status'] !== 'APPROVED') return false;

&#x20;   var d = toDateOrNull\_(r\['Lubrication Date']);

&#x20;   if (!d || d < fromDate || d > toDate) return false;

&#x20;   return !!pointByLpId\[r\['LP ID']];

&#x20; });



&#x20; function groupKey(lubricantTypeName, areaName, equipmentName) {

&#x20;   if (groupBy === 'area') return areaName || 'Unassigned';

&#x20;   if (groupBy === 'equipment') return equipmentName || 'Unknown';

&#x20;   return lubricantTypeName || 'Unspecified';

&#x20; }



&#x20; var buckets = {};

&#x20; points.forEach(function (p) {

&#x20;   if (String(p.frequencyType).toLowerCase() !== 'calendar' || !p.frequencyIntervalDays || !p.standardQuantityL) return;

&#x20;   var occurrences = rangeDays / p.frequencyIntervalDays;

&#x20;   var key = groupKey(p.lubricantType, p.areaName, p.assetName);

&#x20;   buckets\[key] = buckets\[key] || { planned: 0, actual: 0 };

&#x20;   buckets\[key].planned += p.standardQuantityL \* occurrences;

&#x20; });

&#x20; records.forEach(function (r) {

&#x20;   if (!r\['Quantity Used (L)']) return;

&#x20;   var lp = pointByLpId\[r\['LP ID']];

&#x20;   var key = groupKey(lp.lubricantType, lp.areaName, lp.assetName);

&#x20;   buckets\[key] = buckets\[key] || { planned: 0, actual: 0 };

&#x20;   buckets\[key].actual += Number(r\['Quantity Used (L)']);

&#x20; });



&#x20; return {

&#x20;   from: toIso\_(fromDate), to: toIso\_(toDate), groupBy: groupBy,

&#x20;   rows: Object.keys(buckets).map(function (key) {

&#x20;     var v = buckets\[key];

&#x20;     return { key: key, plannedL: Math.round(v.planned \* 10) / 10, actualL: Math.round(v.actual \* 10) / 10, varianceL: Math.round((v.actual - v.planned) \* 10) / 10 };

&#x20;   })

&#x20; };

}



function api\_getOilForecast\_(params, user) {

&#x20; requireScreen\_(user, 'oil\_management\_center');

&#x20; var organizationId = user.dataScope === 'ALL\_ORGS' ? params.organizationId : user.organizationId;

&#x20; if (!organizationId) throw apiError\_(400, 'organizationId is required.');



&#x20; var points = filterLpByOrg\_(getLpIndex\_(), organizationId).filter(function (p) { return String(p.frequencyType).toLowerCase() === 'calendar'; });

&#x20; var buckets = {};

&#x20; points.forEach(function (p) {

&#x20;   var bucket = computeLubricationStatus\_(lpStatusInput\_(p)).bucket;

&#x20;   if (\['OVERDUE', 'DUE\_TODAY', 'DUE\_THIS\_WEEK', 'DUE\_THIS\_MONTH'].indexOf(bucket) !== -1) {

&#x20;     var key = p.lubricantType || 'Unspecified';

&#x20;     buckets\[key] = (buckets\[key] || 0) + (p.standardQuantityL || 0);

&#x20;   }

&#x20; });

&#x20; var forecast = Object.keys(buckets).map(function (k) { return { lubricantType: k, quantityL: Math.round(buckets\[k] \* 10) / 10 }; });



&#x20; notify\_({ typeName: '30-Day Oil Need Forecast', organizationId: organizationId, message: '30-day oil forecast generated: ' + forecast.length + ' lubricant type(s) needed for upcoming due/overdue points.' });



&#x20; return { forecast: forecast };

}



function api\_getPurchaseLog\_(params, user) {

&#x20; requireScreen\_(user, 'oil\_management\_center');

&#x20; var rows = readRows\_(BOOK.OPERATIONAL, SHEETS.OIL\_PURCHASE\_LOG);

&#x20; if (user.dataScope !== 'ALL\_ORGS') rows = rows.filter(function (r) { return r\['Organization'] === user.organizationId; });

&#x20; rows.sort(function (a, b) { return toDateOrNull\_(b\['Purchase Date']) - toDateOrNull\_(a\['Purchase Date']); });

&#x20; return { purchases: rows.map(function (r) { return { id: r\['Purchase ID'], organization: r\['Organization'], lubricantType: r\['Lubricant Type'], quantityL: r\['Quantity (L)'], purchaseDate: toIso\_(r\['Purchase Date']), loggedBy: r\['Logged By'] || null }; }) };

}



function api\_createPurchaseLog\_(params, user) {

&#x20; requireScreen\_(user, 'oil\_management\_center');

&#x20; if (!user.capabilities.managePurchaseLog) throw apiError\_(403, 'Missing capability: managePurchaseLog');

&#x20; if (!user.organizationId) throw apiError\_(400, 'Your account has no organization assigned.');

&#x20; if (!params.lubricantTypeId || !params.quantityL || !params.purchaseDate) throw apiError\_(400, 'lubricantTypeId, quantityL, and purchaseDate are required.');



&#x20; var id;

&#x20; withScriptLock\_(function () {

&#x20;   id = nextSequentialId\_(BOOK.OPERATIONAL, SHEETS.OIL\_PURCHASE\_LOG, 'Purchase ID', 'PUR-', 4);

&#x20;   appendRowObj\_(BOOK.OPERATIONAL, SHEETS.OIL\_PURCHASE\_LOG, {

&#x20;     'Purchase ID': id, 'Organization': user.organizationId, 'Lubricant Type': params.lubricantTypeId,

&#x20;     'Quantity (L)': Number(params.quantityL), 'Purchase Date': new Date(params.purchaseDate), 'Logged By': user.name

&#x20;   });

&#x20; });

&#x20; return { purchase: { id: id, status: 'logged' } };

}



// ─────────────────────────────────────────────────────────────────────────

// API: OIL SAMPLE CENTER (list / detail / trend / create — PDF extraction

// is OUT OF SCOPE for this migration; see MIGRATION\_CHECKLIST.md)

// ─────────────────────────────────────────────────────────────────────────



function api\_getOilSamples\_(params, user) {

&#x20; requireScreen\_(user, 'oil\_sample\_center');

&#x20; var points = getLpIndex\_();

&#x20; var orgId = user.dataScope !== 'ALL\_ORGS' ? user.organizationId : (params.contractor || null);

&#x20; var inScope = filterLpByOrg\_(points, orgId);

&#x20; var lpIds = {}; inScope.forEach(function (p) { lpIds\[p.lpIdCode] = p; });



&#x20; var rows = readRows\_(BOOK.OPERATIONAL, SHEETS.OIL\_SAMPLES).filter(function (s) { return lpIds\[s\['LP ID']]; });

&#x20; if (params.status) rows = rows.filter(function (s) { return s\['Report Status'] === params.status; });

&#x20; rows.sort(function (a, b) { return toDateOrNull\_(b\['Sampled Date']) - toDateOrNull\_(a\['Sampled Date']); });



&#x20; return {

&#x20;   samples: rows.map(function (s) {

&#x20;     var lp = lpIds\[s\['LP ID']] || {};

&#x20;     return { id: s\['Lab Sample ID'], lpIdCode: s\['LP ID'], equipment: lp.assetName || s\['Equipment'], sampledDate: toIso\_(s\['Sampled Date']), reportStatus: s\['Report Status'], recommendations: s\['Recommendations'] || null };

&#x20;   })

&#x20; };

}



function api\_getOilSampleById\_(params, user) {

&#x20; requireScreen\_(user, 'oil\_sample\_center');

&#x20; var sample = readRows\_(BOOK.OPERATIONAL, SHEETS.OIL\_SAMPLES).filter(function (s) { return s\['Lab Sample ID'] === params.id; })\[0];

&#x20; if (!sample) throw apiError\_(404, 'Oil sample not found.');

&#x20; var parameters = readRows\_(BOOK.OPERATIONAL, SHEETS.OIL\_SAMPLE\_PARAMETERS).filter(function (p) { return p\['Lab Sample ID'] === params.id; });

&#x20; return {

&#x20;   id: sample\['Lab Sample ID'], lpIdCode: sample\['LP ID'], equipment: sample\['Equipment'],

&#x20;   sampledDate: toIso\_(sample\['Sampled Date']), reportStatus: sample\['Report Status'],

&#x20;   recommendations: sample\['Recommendations'] || null, sourcePdfUrl: sample\['Source PDF URL'] || null,

&#x20;   parameters: parameters.map(function (p) { return { group: p\['Parameter Group'], key: p\['Parameter Key'], label: p\['Parameter Label'], unit: p\['Unit'] || null, value: p\['Value'], status: p\['Status'] }; })

&#x20; };

}



function api\_getOilSampleTrend\_(params, user) {

&#x20; requireScreen\_(user, 'oil\_sample\_center');

&#x20; var samples = readRows\_(BOOK.OPERATIONAL, SHEETS.OIL\_SAMPLES).filter(function (s) { return s\['LP ID'] === params.lpId; })

&#x20;   .sort(function (a, b) { return toDateOrNull\_(a\['Sampled Date']) - toDateOrNull\_(b\['Sampled Date']); });

&#x20; var sampleIds = {}; samples.forEach(function (s) { sampleIds\[s\['Lab Sample ID']] = true; });

&#x20; var allParams = readRows\_(BOOK.OPERATIONAL, SHEETS.OIL\_SAMPLE\_PARAMETERS).filter(function (p) { return sampleIds\[p\['Lab Sample ID']]; });

&#x20; return {

&#x20;   samples: samples.map(function (s) { return { id: s\['Lab Sample ID'], sampledDate: toIso\_(s\['Sampled Date']), reportStatus: s\['Report Status'] }; }),

&#x20;   parameters: allParams.map(function (p) { return { sampleId: p\['Lab Sample ID'], key: p\['Parameter Key'], label: p\['Parameter Label'], unit: p\['Unit'] || null, value: p\['Value'], status: p\['Status'] }; })

&#x20; };

}



function api\_createOilSample\_(params, user) {

&#x20; requireScreen\_(user, 'oil\_sample\_center');

&#x20; if (!params.lpId || !params.sampledDate) throw apiError\_(400, 'lpId and sampledDate are required.');

&#x20; var points = getLpIndex\_();

&#x20; var lp = points.filter(function (p) { return p.lpIdCode === params.lpId; })\[0];

&#x20; if (!lp) throw apiError\_(404, 'Lubrication point not found.');



&#x20; var id = params.sampleIdLab || ('LAB-' + new Date().getTime());

&#x20; appendRowObj\_(BOOK.OPERATIONAL, SHEETS.OIL\_SAMPLES, {

&#x20;   'Lab Sample ID': id, 'LP ID': lp.lpIdCode, 'Equipment': lp.assetName, 'Sampled Date': new Date(params.sampledDate),

&#x20;   'Report Status': params.reportStatus || 'NORMAL', 'Recommendations': params.recommendations || '',

&#x20;   'Source PDF URL': params.sourcePdfUrl || '', 'Uploaded By': user.name, 'Uploaded At': new Date()

&#x20; });

&#x20; (params.parameters || \[]).forEach(function (p) {

&#x20;   appendRowObj\_(BOOK.OPERATIONAL, SHEETS.OIL\_SAMPLE\_PARAMETERS, {

&#x20;     'Lab Sample ID': id, 'Parameter Group': p.group || '', 'Parameter Key': p.key, 'Parameter Label': p.label || p.key,

&#x20;     'Unit': p.unit || '', 'Value': p.value === undefined ? '' : p.value, 'Status': p.status || 'NORMAL'

&#x20;   });

&#x20; });

&#x20; // Keep the point's cached oil-analysis fields current.

&#x20; updateRowByKey\_(BOOK.OPERATIONAL, SHEETS.LUBRICATION\_POINTS, 'LP ID', lp.lpIdCode, { 'Last Oil Sample Date': new Date(params.sampledDate) });



&#x20; return { sample: { id: id, lpId: lp.lpIdCode } };

}



// ─────────────────────────────────────────────────────────────────────────

// API: ROUTE CENTER (static + dynamic routes, assignments, execution)

// ─────────────────────────────────────────────────────────────────────────



function assertLpIdsInContractorScope\_(lpIds, organization, user) {

&#x20; var points = getLpIndex\_();

&#x20; var pointByLpId = {};

&#x20; points.forEach(function (p) { pointByLpId\[p.lpIdCode] = p; });



&#x20; if (user.dataScope === 'ALL\_ORGS' \&\& !organization) {

&#x20;   throw apiError\_(400, 'Contractor selection is required. Choose RHI or ASEC.');

&#x20; }



&#x20; var seenContractors = {};

&#x20; for (var i = 0; i < lpIds.length; i++) {

&#x20;   var lpId = String(lpIds\[i] || '').trim();

&#x20;   if (!lpId) continue;

&#x20;   var lp = pointByLpId\[lpId];

&#x20;   if (!lp) throw apiError\_(404, 'Lubrication point not found: ' + lpId);

&#x20;   if (user.dataScope !== 'ALL\_ORGS' \&\& lp.contractor !== user.organizationId) {

&#x20;     throw apiError\_(403, 'Not authorized to include lubrication points outside your organization.');

&#x20;   }

&#x20;   var lpContractor = lp.contractor || '';

&#x20;   if (lpContractor) seenContractors\[lpContractor] = true;

&#x20;   if (organization \&\& lpContractor \&\& lpContractor !== organization) {

&#x20;     throw apiError\_(403, 'Route cannot mix contractors. Point ' + lpId + ' belongs to ' + lpContractor + ' but route organization is ' + organization + '.');

&#x20;   }

&#x20; }

&#x20; var contractorKeys = Object.keys(seenContractors);

&#x20; if (contractorKeys.length > 1) {

&#x20;   throw apiError\_(403, 'A route cannot contain lubrication points from more than one contractor (RHI and ASEC cannot be mixed).');

&#x20; }

&#x20; if (organization \&\& contractorKeys.length === 1 \&\& contractorKeys\[0] !== organization) {

&#x20;   throw apiError\_(403, 'All lubrication points must belong to contractor ' + organization + '.');

&#x20; }

}



function assertRouteOrgAccess\_(user, routeOrganization) {

&#x20; if (user.dataScope === 'ALL\_ORGS') return;

&#x20; if (!user.organizationId || routeOrganization !== user.organizationId) {

&#x20;   throw apiError\_(403, "Not authorized for this contractor's routes.");

&#x20; }

}



function resolveUserOrgByTitle\_(titleName) {

&#x20; var titles = readRows\_(BOOK.CONFIG, SHEETS.TITLES);

&#x20; var titleRow = titles.filter(function (t) { return t\['Title Name'] === titleName; })\[0];

&#x20; if (!titleRow) return null;

&#x20; var org = titleRow\['Organization'];

&#x20; return org === '(all orgs)' ? null : org;

}



function assertTechnicianInRouteOrg\_(technicianName, routeOrganization) {

&#x20; var users = readRows\_(BOOK.CONFIG, SHEETS.USERS);

&#x20; var techUser = users.filter(function (u) { return u\['Name'] === technicianName; })\[0];

&#x20; if (!techUser) throw apiError\_(400, 'Technician not found: ' + technicianName);

&#x20; var techOrg = resolveUserOrgByTitle\_(techUser\['Title']);

&#x20; if (!techOrg) return;

&#x20; if (techOrg !== routeOrganization) {

&#x20;   throw apiError\_(403, 'Technician does not belong to the route contractor organization.');

&#x20; }

}



function resolveTechnicianById\_(technicianId) {

&#x20; var id = String(technicianId || '').trim();

&#x20; if (!id) throw apiError\_(400, 'technicianId is required.');

&#x20; var users = readRows\_(BOOK.CONFIG, SHEETS.USERS);

&#x20; var techUser = users.filter(function (u) { return u\['Email'] === id; })\[0];

&#x20; if (!techUser) throw apiError\_(400, 'Technician not found.');

&#x20; if (String(techUser\['Title'] || '').indexOf('Technician') === -1) {

&#x20;   throw apiError\_(400, 'Selected user is not a technician.');

&#x20; }

&#x20; return { id: techUser\['Email'], name: techUser\['Name'] };

}



function ensureRouteSheetColumns\_() {

&#x20; var sheet = getSheet\_(BOOK.OPERATIONAL, SHEETS.ROUTES);

&#x20; var headerRow = findHeaderRow\_(sheet);

&#x20; var lastCol = sheet.getLastColumn();

&#x20; var headers = sheet.getRange(headerRow, 1, 1, lastCol).getValues()\[0];

&#x20; \['Area', 'Due Date', 'Equipment IDs', 'Deleted', 'Created At', 'Created By', 'Frequency',

&#x20;   'Series ID', 'Parent Route ID', 'Oil Type Filter'].forEach(function (h) {

&#x20;   if (headers.indexOf(h) === -1) {

&#x20;     lastCol++;

&#x20;     sheet.getRange(headerRow, lastCol).setValue(h);

&#x20;     headers.push(h);

&#x20;   }

&#x20; });

&#x20; var assignSheet = getSheet\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_ASSIGNMENTS);

&#x20; var aHeaderRow = findHeaderRow\_(assignSheet);

&#x20; var aLastCol = assignSheet.getLastColumn();

&#x20; var aHeaders = assignSheet.getRange(aHeaderRow, 1, 1, aLastCol).getValues()\[0];

&#x20; if (aHeaders.indexOf('Technician ID') === -1) {

&#x20;   assignSheet.getRange(aHeaderRow, aLastCol + 1).setValue('Technician ID');

&#x20; }

&#x20; SpreadsheetApp.flush();

}



function routeHasExecutionRecords\_(assignmentId) {

&#x20; if (!assignmentId) return false;

&#x20; var logs = readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_EXECUTION\_LOG)

&#x20;   .filter(function (l) { return l\['Assignment ID'] === assignmentId; });

&#x20; return logs.some(function (l) { return l\['Status'] !== 'PENDING'; });

}



// ── P03.8 Recurring Route Engine ─────────────────────────────────────────────



function calculateNextRouteDueDate\_(dueDate, frequency) {

&#x20; if (!dueDate || String(frequency || '') === 'One Time') return null;

&#x20; var d = dueDate instanceof Date ? new Date(dueDate.getTime()) : new Date(dueDate);

&#x20; if (isNaN(d.getTime())) return null;

&#x20; d.setHours(0, 0, 0, 0);

&#x20; switch (String(frequency)) {

&#x20;   case 'Daily': d.setDate(d.getDate() + 1); break;

&#x20;   case 'Weekly': d.setDate(d.getDate() + 7); break;

&#x20;   case 'Monthly': d.setMonth(d.getMonth() + 1); break;

&#x20;   case '3 Months': d.setMonth(d.getMonth() + 3); break;

&#x20;   case '6 Months': d.setMonth(d.getMonth() + 6); break;

&#x20;   case '1 Year': d.setFullYear(d.getFullYear() + 1); break;

&#x20;   default: return null;

&#x20; }

&#x20; return d;

}



function routeChildAlreadyExists\_(parentRouteId) {

&#x20; return readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTES).some(function (r) {

&#x20;   return r\['Parent Route ID'] === parentRouteId \&\& String(r\['Deleted'] || '').toLowerCase() !== 'yes';

&#x20; });

}



function generateNextRecurringRoute\_(completedRouteId, completedAssignment) {

&#x20; ensureRouteSheetColumns\_();

&#x20; var route = readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTES)

&#x20;   .filter(function (r) { return r\['Route ID'] === completedRouteId; })\[0];

&#x20; if (!route) return;

&#x20; var frequency = String(route\['Frequency'] || 'One Time');

&#x20; if (frequency === 'One Time') return;

&#x20; if (routeChildAlreadyExists\_(completedRouteId)) return;



&#x20; var currentDue = toDateOrNull\_(route\['Due Date']);

&#x20; var nextDue = calculateNextRouteDueDate\_(currentDue, frequency);

&#x20; if (!nextDue) return;



&#x20; var lpIds = String(route\['LP IDs'] || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);

&#x20; if (!lpIds.length) return;



&#x20; var seriesId = String(route\['Series ID'] || completedRouteId);

&#x20; var newId;

&#x20; withScriptLock\_(function () {

&#x20;   newId = nextSequentialId\_(BOOK.OPERATIONAL, SHEETS.ROUTES, 'Route ID', 'RT-', 3);

&#x20;   appendRowObj\_(BOOK.OPERATIONAL, SHEETS.ROUTES, {

&#x20;     'Route ID': newId,

&#x20;     'Organization': route\['Organization'],

&#x20;     'Name': route\['Name'],

&#x20;     'Type': route\['Type'],

&#x20;     'LP IDs': lpIds.join(', '),

&#x20;     'Area': route\['Area'] || '',

&#x20;     'Due Date': nextDue,

&#x20;     'Frequency': frequency,

&#x20;     'Equipment IDs': route\['Equipment IDs'] || '',

&#x20;     'Oil Type Filter': route\['Oil Type Filter'] || '',

&#x20;     'Series ID': seriesId,

&#x20;     'Parent Route ID': completedRouteId,

&#x20;     'Deleted': 'No',

&#x20;     'Created At': new Date(),

&#x20;     'Created By': 'System (Recurring)'

&#x20;   });

&#x20; });



&#x20; if (completedAssignment \&\& completedAssignment\['Technician ID']) {

&#x20;   try {

&#x20;     var tech = resolveTechnicianById\_(completedAssignment\['Technician ID']);

&#x20;     assertTechnicianInRouteOrg\_(tech.name, route\['Organization']);

&#x20;     var assignId = nextSequentialId\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_ASSIGNMENTS, 'Assignment ID', 'RA-', 3);

&#x20;     appendRowObj\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_ASSIGNMENTS, {

&#x20;       'Assignment ID': assignId,

&#x20;       'Route ID': newId,

&#x20;       'Technician': tech.name,

&#x20;       'Technician ID': tech.id,

&#x20;       'Assigned Date': new Date(),

&#x20;       'Status': 'ASSIGNED',

&#x20;       'Started At': '',

&#x20;       'Completed At': ''

&#x20;     });

&#x20;     lpIds.forEach(function (lpId) {

&#x20;       appendRowObj\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_EXECUTION\_LOG, {

&#x20;         'Assignment ID': assignId, 'LP ID': lpId, 'Status': 'PENDING', 'Skip Reason': '', 'Completed At': ''

&#x20;       });

&#x20;     });

&#x20;   } catch (e) {

&#x20;     Logger.log('generateNextRecurringRoute assign skip: ' + (e \&\& e.message));

&#x20;   }

&#x20; }

&#x20; invalidateOperationalCaches\_();

}



function propagateFrequencyToFutureRoutes\_(routeId, frequency) {

&#x20; var route = readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTES)

&#x20;   .filter(function (r) { return r\['Route ID'] === routeId; })\[0];

&#x20; if (!route) return;

&#x20; var seriesId = String(route\['Series ID'] || routeId);

&#x20; var allRoutes = readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTES);

&#x20; var allAssignments = readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_ASSIGNMENTS);

&#x20; var allExecLogs = readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_EXECUTION\_LOG);

&#x20; allRoutes.forEach(function (r) {

&#x20;   if (String(r\['Series ID'] || r\['Route ID']) !== seriesId) return;

&#x20;   if (r\['Route ID'] === routeId) return;

&#x20;   if (String(r\['Deleted'] || '').toLowerCase() === 'yes') return;

&#x20;   var lpIds = String(r\['LP IDs'] || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);

&#x20;   var routeAssignments = allAssignments.filter(function (a) { return a\['Route ID'] === r\['Route ID']; });

&#x20;   var active = pickActiveRouteAssignment\_(routeAssignments);

&#x20;   var execLogs = active

&#x20;     ? allExecLogs.filter(function (l) { return l\['Assignment ID'] === active\['Assignment ID']; })

&#x20;     : \[];

&#x20;   var status = deriveRouteWorkflowStatus\_(active, execLogs, lpIds.length);

&#x20;   if (status === 'Draft' || status === 'Assigned') {

&#x20;     updateRowByKey\_(BOOK.OPERATIONAL, SHEETS.ROUTES, 'Route ID', r\['Route ID'], { 'Frequency': frequency });

&#x20;   }

&#x20; });

}



function ensureRouteNotificationTypes\_() {

&#x20; var sheet = getSheet\_(BOOK.CONFIG, SHEETS.NOTIFICATION\_TYPES);

&#x20; var headerRow = findHeaderRow\_(sheet);

&#x20; var lastCol = sheet.getLastColumn();

&#x20; var headers = sheet.getRange(headerRow, 1, 1, lastCol).getValues()\[0];

&#x20; var existing = readRows\_(BOOK.CONFIG, SHEETS.NOTIFICATION\_TYPES);

&#x20; var defs = \[

&#x20;   { name: 'Route Due Today', priority: 'WARNING', recipients: 'OWN\_ORG\_ENGINEER' },

&#x20;   { name: 'Route Due Soon', priority: 'INFO', recipients: 'OWN\_ORG\_ENGINEER' },

&#x20;   { name: 'Route Overdue', priority: 'HIGH', recipients: 'OWN\_ORG\_ENGINEER' }

&#x20; ];

&#x20; defs.forEach(function (d) {

&#x20;   if (existing.some(function (t) { return t\['Name'] === d.name; })) return;

&#x20;   var row = {};

&#x20;   headers.forEach(function (h) { row\[h] = ''; });

&#x20;   row\['Name'] = d.name;

&#x20;   row\['Default Priority'] = d.priority;

&#x20;   row\['Recipients'] = d.recipients;

&#x20;   row\['Channels'] = 'IN\_APP';

&#x20;   appendRowObj\_(BOOK.CONFIG, SHEETS.NOTIFICATION\_TYPES, row);

&#x20; });

}



function routeNotificationCacheKey\_(routeId, typeName) {

&#x20; var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

&#x20; return 'route\_ntf\_' + routeId + '\_' + typeName + '\_' + today;

}



function scanRouteDueNotifications\_() {

&#x20; ensureRouteNotificationTypes\_();

&#x20; var today = new Date(); today.setHours(0, 0, 0, 0);

&#x20; var allRoutes = readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTES)

&#x20;   .filter(function (r) { return String(r\['Deleted'] || '').toLowerCase() !== 'yes'; });

&#x20; var allAssignments = readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_ASSIGNMENTS);

&#x20; var allExecLogs = readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_EXECUTION\_LOG);

&#x20; var cache = CacheService.getScriptCache();



&#x20; allRoutes.forEach(function (r) {

&#x20;   var due = toDateOrNull\_(r\['Due Date']);

&#x20;   if (!due) return;

&#x20;   due.setHours(0, 0, 0, 0);

&#x20;   var routeId = r\['Route ID'];

&#x20;   var routeAssignments = allAssignments.filter(function (a) { return a\['Route ID'] === routeId; });

&#x20;   var active = pickActiveRouteAssignment\_(routeAssignments);

&#x20;   var lpIds = String(r\['LP IDs'] || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);

&#x20;   var execLogs = active

&#x20;     ? allExecLogs.filter(function (l) { return l\['Assignment ID'] === active\['Assignment ID']; })

&#x20;     : \[];

&#x20;   var status = deriveRouteWorkflowStatus\_(active, execLogs, lpIds.length);

&#x20;   if (status === 'Completed' || status === 'Cancelled') return;



&#x20;   var daysDiff = Math.round((due.getTime() - today.getTime()) / 86400000);

&#x20;   var typeName = null;

&#x20;   if (daysDiff < 0) typeName = 'Route Overdue';

&#x20;   else if (daysDiff === 0) typeName = 'Route Due Today';

&#x20;   else if (daysDiff <= 7) typeName = 'Route Due Soon';

&#x20;   if (!typeName) return;



&#x20;   var cacheKey = routeNotificationCacheKey\_(routeId, typeName);

&#x20;   if (cache.get(cacheKey)) return;



&#x20;   notify\_({

&#x20;     typeName: typeName,

&#x20;     organizationId: r\['Organization'],

&#x20;     message: r\['Name'] + ' (' + routeId + ') — ' + (

&#x20;       daysDiff < 0 ? Math.abs(daysDiff) + ' day(s) overdue' :

&#x20;       daysDiff === 0 ? 'due today' : 'due in ' + daysDiff + ' day(s)'

&#x20;     ) + '.',

&#x20;     relatedEntityType: 'Route',

&#x20;     relatedEntityId: routeId

&#x20;   });

&#x20;   cache.put(cacheKey, '1', 86400);

&#x20; });

}



/\*\* Time-driven trigger entry point — install via Apps Script Triggers UI (daily). \*/

function runDailyRouteDueScan() {

&#x20; scanRouteDueNotifications\_();

}



function syncRouteExecLogForAssignment\_(assignmentId, lpIds) {

&#x20; var sheet = getSheet\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_EXECUTION\_LOG);

&#x20; var table = readTable\_(sheet);

&#x20; table.rows.filter(function (r) { return r\['Assignment ID'] === assignmentId; }).forEach(function (r) {

&#x20;   sheet.deleteRow(r.\_\_row);

&#x20; });

&#x20; SpreadsheetApp.flush();

&#x20; lpIds.forEach(function (lpId) {

&#x20;   appendRowObj\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_EXECUTION\_LOG, {

&#x20;     'Assignment ID': assignmentId, 'LP ID': lpId, 'Status': 'PENDING', 'Skip Reason': '', 'Completed At': ''

&#x20;   });

&#x20; });

}



function pickActiveRouteAssignment\_(assignments) {

&#x20; if (!assignments || !assignments.length) return null;

&#x20; var inProgress = assignments.filter(function (a) { return a\['Status'] === 'IN\_PROGRESS'; });

&#x20; if (inProgress.length) return inProgress\[inProgress.length - 1];

&#x20; var assigned = assignments.filter(function (a) { return a\['Status'] === 'ASSIGNED'; });

&#x20; if (assigned.length) return assigned\[assigned.length - 1];

&#x20; return assignments\[assignments.length - 1];

}



var SKIP\_REASON\_OPTIONS\_ = \[

&#x20; 'Equipment Stopped', 'Safety Restriction', 'No Access', 'Lubrication Point Damaged',

&#x20; 'Lubricant Unavailable', 'Route Assigned Incorrectly', 'Sampling Not Possible', 'Technician Absent', 'Other'

];



function isExecPointResolved\_(status) {

&#x20; return status === 'DONE' || status === 'SKIP\_APPROVED' || status === 'SKIPPED';

}



function isExecPointSkippedKpi\_(status) {

&#x20; return status === 'SKIP\_APPROVED' || status === 'SKIPPED';

}



function deriveRouteWorkflowStatus\_(assignment, execLogs, pointCount) {

&#x20; if (!assignment) return 'Draft';

&#x20; var doneCount = execLogs.filter(function (l) { return isExecPointResolved\_(l\['Status']); }).length;

&#x20; if (pointCount > 0 \&\& doneCount >= pointCount) return 'Completed';

&#x20; var status = String(assignment\['Status'] || '');

&#x20; if (status === 'IN\_PROGRESS') return 'In Progress';

&#x20; if (status === 'ASSIGNED') return 'Assigned';

&#x20; return 'Draft';

}



function mapExecStatusToPointLabel\_(status) {

&#x20; if (status === 'DONE') return 'Completed';

&#x20; if (status === 'SKIP\_PENDING') return 'Skip Pending Approval';

&#x20; if (status === 'SKIP\_APPROVED' || status === 'SKIPPED') return 'Skip Approved';

&#x20; return 'Pending';

}



function ensureRouteExecutionLogColumns\_() {

&#x20; var sheet = getSheet\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_EXECUTION\_LOG);

&#x20; var headerRow = findHeaderRow\_(sheet);

&#x20; var lastCol = sheet.getLastColumn();

&#x20; var headers = sheet.getRange(headerRow, 1, 1, lastCol).getValues()\[0];

&#x20; \['Skip Comment', 'Skip Requested At', 'Skip Requested By', 'Skip Approved By', 'Skip Approved At',

&#x20;   'Skip Rejected By', 'Skip Rejection Reason', 'Skip Reminder Count'].forEach(function (h) {

&#x20;   if (headers.indexOf(h) !== -1) return;

&#x20;   sheet.getRange(headerRow, lastCol + 1).setValue(h);

&#x20;   lastCol++;

&#x20;   headers.push(h);

&#x20; });

}



function ensureSkipNotificationTypes\_() {

&#x20; var sheet = getSheet\_(BOOK.CONFIG, SHEETS.NOTIFICATION\_TYPES);

&#x20; var headerRow = findHeaderRow\_(sheet);

&#x20; var lastCol = sheet.getLastColumn();

&#x20; var headers = sheet.getRange(headerRow, 1, 1, lastCol).getValues()\[0];

&#x20; var existing = readRows\_(BOOK.CONFIG, SHEETS.NOTIFICATION\_TYPES);

&#x20; var defs = \[

&#x20;   { name: 'Route Skip Requested', priority: 'WARNING', recipients: 'OWN\_ORG\_ENGINEER,OWN\_ORG\_MANAGER' },

&#x20;   { name: 'Route Skip Approved', priority: 'INFO', recipients: 'OWN\_ORG\_ENGINEER' },

&#x20;   { name: 'Route Skip Rejected', priority: 'WARNING', recipients: 'OWN\_ORG\_ENGINEER,OWN\_ORG\_MANAGER' },

&#x20;   { name: 'Route Skip Due Reminder', priority: 'WARNING', recipients: 'OWN\_ORG\_ENGINEER' },

&#x20;   { name: 'Route Skip Escalation', priority: 'HIGH', recipients: 'OWN\_ORG\_MANAGER' }

&#x20; ];

&#x20; defs.forEach(function (d) {

&#x20;   if (existing.some(function (t) { return t\['Name'] === d.name; })) return;

&#x20;   var row = {};

&#x20;   headers.forEach(function (h) { row\[h] = ''; });

&#x20;   row\['Name'] = d.name;

&#x20;   row\['Default Priority'] = d.priority;

&#x20;   row\['Recipients'] = d.recipients;

&#x20;   row\['Channels'] = 'IN\_APP';

&#x20;   appendRowObj\_(BOOK.CONFIG, SHEETS.NOTIFICATION\_TYPES, row);

&#x20; });

}



function getTechnicianEmailByName\_(name) {

&#x20; var users = readRows\_(BOOK.CONFIG, SHEETS.USERS);

&#x20; var u = users.filter(function (x) { return x\['Name'] === name; })\[0];

&#x20; return u ? u\['Email'] : null;

}



function getRouteContextForAssignment\_(assignmentId) {

&#x20; var a = readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_ASSIGNMENTS)

&#x20;   .filter(function (x) { return x\['Assignment ID'] === assignmentId; })\[0];

&#x20; if (!a) return null;

&#x20; var route = readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTES)

&#x20;   .filter(function (r) { return r\['Route ID'] === a\['Route ID']; })\[0];

&#x20; if (!route) return null;

&#x20; return { assignment: a, route: route, organization: route\['Organization'] };

}



function buildSkipReasonText\_(category, otherText) {

&#x20; if (category === 'Other') return String(otherText || '').trim();

&#x20; return category;

}



function validateSkipReason\_(category, otherText) {

&#x20; if (!category || SKIP\_REASON\_OPTIONS\_.indexOf(category) === -1) {

&#x20;   throw apiError\_(400, 'A valid skip reason is required.');

&#x20; }

&#x20; if (category === 'Other' \&\& !String(otherText || '').trim()) {

&#x20;   throw apiError\_(400, 'Reason text is required when Other is selected.');

&#x20; }

}



function findExecLogRow\_(assignmentId, lpId) {

&#x20; var sheet = getSheet\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_EXECUTION\_LOG);

&#x20; var table = readTable\_(sheet);

&#x20; var row = table.rows.filter(function (r) {

&#x20;   return r\['Assignment ID'] === assignmentId \&\& r\['LP ID'] === lpId;

&#x20; })\[0];

&#x20; return row ? { sheet: sheet, table: table, row: row } : null;

}



function notifySkipDecision\_(typeName, orgId, message, technicianEmail) {

&#x20; var extra = technicianEmail ? \[technicianEmail] : \[];

&#x20; notify\_({ typeName: typeName, organizationId: orgId, message: message, relatedEntityType: 'RouteExecutionLog', relatedEntityId: '', extraEmails: extra });

}



function createSkipRejectionActionPlan\_(ctx, lpId, lp, reason, user) {

&#x20; var equipId = lp \&\& lp.equipmentIdCode ? lp.equipmentIdCode : (lp \&\& lp.assetName) || '';

&#x20; if (!equipId) return;

&#x20; var actionTypes = readRows\_(BOOK.CONFIG, SHEETS.ACTION\_TYPES);

&#x20; var typeName = actionTypes.some(function (a) { return a\['Name'] === 'Route Reassignment'; })

&#x20;   ? 'Route Reassignment' : (actionTypes\[0] ? actionTypes\[0]\['Name'] : null);

&#x20; if (!typeName) return;

&#x20; withScriptLock\_(function () {

&#x20;   var id = nextSequentialId\_(BOOK.OPERATIONAL, SHEETS.ACTION\_PLANS, 'Action ID', 'ACT-', 5);

&#x20;   appendRowObj\_(BOOK.OPERATIONAL, SHEETS.ACTION\_PLANS, {

&#x20;     'Action ID': id,

&#x20;     'Action Type': typeName,

&#x20;     'Auto/Manual': 'Auto',

&#x20;     'Equipment': equipId,

&#x20;     'LP IDs': lpId,

&#x20;     'Description': 'Skip rejected for ' + lpId + ' on route ' + (ctx.route\['Name'] || '') + '. Re-execute or re-request skip. Reason: ' + reason,

&#x20;     'Priority': 'HIGH',

&#x20;     'Owner': '',

&#x20;     'Due Date': '',

&#x20;     'Status': 'OPEN',

&#x20;     'Created By': user.name,

&#x20;     'Created At': new Date(),

&#x20;     'Closed Date': '',

&#x20;     'Closure Comments': ''

&#x20;   });

&#x20; });

}



function scanSkipApprovedReminders\_() {

&#x20; ensureSkipNotificationTypes\_();

&#x20; ensureRouteExecutionLogColumns\_();

&#x20; var logs = readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_EXECUTION\_LOG)

&#x20;   .filter(function (l) { return isExecPointSkippedKpi\_(l\['Status']); });

&#x20; if (!logs.length) return;

&#x20; var assignments = readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_ASSIGNMENTS);

&#x20; var routes = readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTES);

&#x20; var routeById = {};

&#x20; routes.forEach(function (r) { routeById\[r\['Route ID']] = r; });

&#x20; var assignById = {};

&#x20; assignments.forEach(function (a) { assignById\[a\['Assignment ID']] = a; });

&#x20; var cache = CacheService.getScriptCache();

&#x20; var todayKey = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');



&#x20; logs.forEach(function (l) {

&#x20;   var count = parseInt(l\['Skip Reminder Count'] || '0', 10) || 0;

&#x20;   if (count >= 3) return;

&#x20;   var a = assignById\[l\['Assignment ID']];

&#x20;   if (!a) return;

&#x20;   var route = routeById\[a\['Route ID']];

&#x20;   if (!route) return;

&#x20;   var cacheKey = 'skip\_rem\_' + l\['Assignment ID'] + '\_' + l\['LP ID'] + '\_' + todayKey + '\_' + count;

&#x20;   if (cache.get(cacheKey)) return;

&#x20;   var orgId = route\['Organization'];

&#x20;   var lpId = l\['LP ID'];

&#x20;   if (count < 3) {

&#x20;     notify\_({

&#x20;       typeName: 'Route Skip Due Reminder',

&#x20;       organizationId: orgId,

&#x20;       message: 'Skipped point ' + lpId + ' on route "' + (route\['Name'] || '') + '" remains due/overdue. Reminder ' + (count + 1) + ' of 3.',

&#x20;       relatedEntityType: 'RouteExecutionLog',

&#x20;       relatedEntityId: l\['Assignment ID']

&#x20;     });

&#x20;     updateExecLogFields\_(l\['Assignment ID'], lpId, { 'Skip Reminder Count': count + 1 });

&#x20;   }

&#x20;   if (count + 1 >= 3) {

&#x20;     notify\_({

&#x20;       typeName: 'Route Skip Escalation',

&#x20;       organizationId: orgId,

&#x20;       message: 'Skipped point ' + lpId + ' on route "' + (route\['Name'] || '') + '" still due/overdue after 3 engineer reminders.',

&#x20;       relatedEntityType: 'RouteExecutionLog',

&#x20;       relatedEntityId: l\['Assignment ID']

&#x20;     });

&#x20;   }

&#x20;   cache.put(cacheKey, '1', 86400);

&#x20; });

}



function updateExecLogFields\_(assignmentId, lpId, updates) {

&#x20; var found = findExecLogRow\_(assignmentId, lpId);

&#x20; if (!found) return;

&#x20; Object.keys(updates).forEach(function (h) {

&#x20;   var colIdx = found.table.headers.indexOf(h);

&#x20;   if (colIdx === -1) return;

&#x20;   found.sheet.getRange(found.row.\_\_row, colIdx + 1).setValue(updates\[h]);

&#x20; });

&#x20; SpreadsheetApp.flush();

}



function api\_getRoutes\_(params, user) {

&#x20; requireScreen\_(user, 'route\_center');

&#x20; var orgId = user.dataScope !== 'ALL\_ORGS' ? user.organizationId : (params.contractor || null);

&#x20; var routesCacheKey = 'routes\_list\_' + (orgId || 'ALL') + '\_v\_' + (PROPS.getProperty('DATA\_CACHE\_VERSION') || '0');

&#x20; var routesCached = scriptCacheGet\_(routesCacheKey);

&#x20; if (routesCached) return routesCached;



&#x20; var rows = readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTES);

&#x20; rows = rows.filter(function (r) { return String(r\['Deleted'] || '').toLowerCase() !== 'yes'; });

&#x20; if (orgId) rows = rows.filter(function (r) { return r\['Organization'] === orgId; });



&#x20; try { scanRouteDueNotifications\_(); } catch (e) { Logger.log('scanRouteDueNotifications: ' + (e \&\& e.message)); }

&#x20; try { scanSkipApprovedReminders\_(); } catch (e) { Logger.log('scanSkipApprovedReminders: ' + (e \&\& e.message)); }

&#x20; ensureRouteExecutionLogColumns\_();



&#x20; var allAssignments = readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_ASSIGNMENTS);

&#x20; var allExecLogs = readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_EXECUTION\_LOG);



&#x20; var routesResult = {

&#x20;   routes: rows.map(function (r) {

&#x20;     var routeId = r\['Route ID'];

&#x20;     var lpIds = String(r\['LP IDs'] || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);

&#x20;     var routeAssignments = allAssignments.filter(function (a) { return a\['Route ID'] === routeId; });

&#x20;     var active = pickActiveRouteAssignment\_(routeAssignments);

&#x20;     var activeId = active ? active\['Assignment ID'] : null;

&#x20;     var execLogs = activeId

&#x20;       ? allExecLogs.filter(function (l) { return l\['Assignment ID'] === activeId; })

&#x20;       : \[];

&#x20;     var completedCount = execLogs.filter(function (l) { return isExecPointResolved\_(l\['Status']); }).length;

&#x20;     var status = deriveRouteWorkflowStatus\_(active, execLogs, lpIds.length);

&#x20;     var points = lpIds.map(function (lpId) {

&#x20;       var log = execLogs.filter(function (l) { return l\['LP ID'] === lpId; })\[0];

&#x20;       return {

&#x20;         lpId: lpId,

&#x20;         lpIdCode: lpId,

&#x20;         status: log ? mapExecStatusToPointLabel\_(log\['Status']) : 'Pending',

&#x20;         execStatus: log ? log\['Status'] : 'PENDING',

&#x20;       };

&#x20;     });



&#x20;     return {

&#x20;       id: routeId,

&#x20;       organization: r\['Organization'],

&#x20;       contractor: r\['Organization'],

&#x20;       name: r\['Name'],

&#x20;       type: r\['Type'],

&#x20;       area: r\['Area'] || '',

&#x20;       dueDate: toIso\_(r\['Due Date']),

&#x20;       nextDue: toIso\_(r\['Due Date']),

&#x20;       frequency: r\['Frequency'] || '',

&#x20;       seriesId: r\['Series ID'] || r\['Route ID'],

&#x20;       parentRouteId: r\['Parent Route ID'] || null,

&#x20;       oilTypeFilter: r\['Oil Type Filter'] || '',

&#x20;       equipmentIds: String(r\['Equipment IDs'] || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean),

&#x20;       createdAt: toIso\_(r\['Created At']),

&#x20;       createdBy: r\['Created By'] || null,

&#x20;       lpIds: lpIds,

&#x20;       pointCount: lpIds.length,

&#x20;       completedCount: completedCount,

&#x20;       status: status,

&#x20;       assignedTechnician: active ? active\['Technician'] : null,

&#x20;       activeAssignmentId: activeId,

&#x20;       assignments: routeAssignments.map(function (a) {

&#x20;         return {

&#x20;           id: a\['Assignment ID'],

&#x20;           technician: a\['Technician'],

&#x20;           status: a\['Status'],

&#x20;           assignedDate: toIso\_(a\['Assigned Date']),

&#x20;         };

&#x20;       }),

&#x20;       points: points,

&#x20;     };

&#x20;   })

&#x20; };

&#x20; scriptCachePut\_(routesCacheKey, routesResult, 120);

&#x20; return routesResult;

}



function api\_getDynamicRoutePreview\_(params, user) {

&#x20; requireScreen\_(user, 'route\_center');

&#x20; var orgId = user.dataScope !== 'ALL\_ORGS' ? user.organizationId : (params.contractor || null);

&#x20; var points = filterLpByOrg\_(getLpIndex\_(), orgId);

&#x20; var due = points.filter(function (p) {

&#x20;   var bucket = computeLubricationStatus\_(lpStatusInput\_(p)).bucket;

&#x20;   return \['OVERDUE', 'DUE\_TODAY', 'DUE\_THIS\_WEEK'].indexOf(bucket) !== -1;

&#x20; });

&#x20; if (params.area) due = due.filter(function (p) { return p.areaName === params.area; });

&#x20; if (params.routeType === 'Sampling') due = due.filter(function (p) { return p.oaRequired; });

&#x20; if (params.routeType === 'Oil Change') due = due.filter(function (p) { return !p.oaRequired; });

&#x20; if (params.equipmentIds) {

&#x20;   var eqIds = String(params.equipmentIds).split(',').map(function (s) { return s.trim(); }).filter(Boolean);

&#x20;   if (eqIds.length) due = due.filter(function (p) { return eqIds.indexOf(p.equipmentIdCode) !== -1; });

&#x20; }

&#x20; return { preview: due.map(function (p) { return { lpId: p.lpIdCode, equipment: p.assetName, area: p.areaName, status: computeLubricationStatus\_(lpStatusInput\_(p)).bucket }; }) };

}



// ── Issue #1: Upload oil change photo to Google Drive ────────────────────────

function api\_uploadOilChangePhoto\_(params, user) {

&#x20; requireScreen\_(user, 'oil\_change\_center');



&#x20; var folderId = getSettingValue\_('drive.oilChangePhotosFolderId', '');

&#x20; if (!folderId) throw apiError\_(400, 'Oil Change Photo Folder is not configured.');



&#x20; var base64Data = params.base64Data;

&#x20; var fileName   = String(params.fileName   || 'oil\_change\_photo.jpg');

&#x20; var mimeType   = String(params.mimeType   || 'image/jpeg');



&#x20; if (!base64Data) throw apiError\_(400, 'No image data provided.');



&#x20; try {

&#x20;   var folder  = DriveApp.getFolderById(folderId);

&#x20;   var decoded = Utilities.base64Decode(base64Data);

&#x20;   var blob    = Utilities.newBlob(decoded, mimeType, fileName);

&#x20;   var file    = folder.createFile(blob);



&#x20;   // Make the file accessible via link (anyone with link can view)

&#x20;   file.setSharing(DriveApp.Access.ANYONE\_WITH\_LINK, DriveApp.Permission.VIEW);



&#x20;   var fileId  = file.getId();

&#x20;   var fileUrl = 'https://drive.google.com/file/d/' + fileId + '/view?usp=sharing';



&#x20;   return { photoUrl: fileUrl, photoFileId: fileId };

&#x20; } catch (err) {

&#x20;   Logger.log('uploadOilChangePhoto error: ' + (err \&\& err.message));

&#x20;   throw apiError\_(500, 'Failed to upload photo to Google Drive. Please try again.');

&#x20; }

}



function api\_createRoute\_(params, user) {

&#x20; // Rev 3 (E): Wrapped in try/catch + improved validation to prevent crashes

&#x20; try {

&#x20;   requireScreen\_(user, 'route\_center');

&#x20;   if (!user.capabilities.manageRoutes) throw apiError\_(403, 'Missing capability: manageRoutes');



&#x20;   var routeName = String(params.name || '').trim();

&#x20;   if (!routeName) throw apiError\_(400, 'Route name is required.');



&#x20;   // ACC must pick one contractor per route; RHI/ASEC use logged-in organization

&#x20;   var organization;

&#x20;   if (user.dataScope === 'ALL\_ORGS') {

&#x20;     organization = String(params.organization || '').trim();

&#x20;     if (!organization) throw apiError\_(400, 'Contractor selection is required. Choose RHI or ASEC.');

&#x20;   } else {

&#x20;     organization = String(user.organizationId || '').trim();

&#x20;     if (!organization) throw apiError\_(400, 'Organization could not be determined.');

&#x20;   }



&#x20;   var lpIds = Array.isArray(params.lpIds) ? params.lpIds : \[];

&#x20;   if (lpIds.length === 0) throw apiError\_(400, 'At least one lubrication point is required to create a route.');



&#x20;   assertLpIdsInContractorScope\_(lpIds, organization, user);

&#x20;   ensureRouteSheetColumns\_();



&#x20;   var id;

&#x20;   withScriptLock\_(function () {

&#x20;     id = nextSequentialId\_(BOOK.OPERATIONAL, SHEETS.ROUTES, 'Route ID', 'RT-', 3);

&#x20;     appendRowObj\_(BOOK.OPERATIONAL, SHEETS.ROUTES, {

&#x20;       'Route ID': id, 'Organization': organization, 'Name': routeName,

&#x20;       'Type': String(params.type || 'Oil Change'), 'LP IDs': lpIds.join(', '),

&#x20;       'Area': String(params.area || ''), 'Due Date': params.dueDate ? new Date(params.dueDate) : '',

&#x20;       'Frequency': String(params.frequency || 'Weekly'),

&#x20;       'Oil Type Filter': String(params.oilTypeFilter || ''),

&#x20;       'Series ID': '',

&#x20;       'Parent Route ID': String(params.parentRouteId || ''),

&#x20;       'Equipment IDs': Array.isArray(params.equipmentIds) ? params.equipmentIds.join(', ') : '',

&#x20;       'Deleted': 'No', 'Created At': new Date(), 'Created By': user.name

&#x20;     });

&#x20;     updateRowByKey\_(BOOK.OPERATIONAL, SHEETS.ROUTES, 'Route ID', id, { 'Series ID': id });

&#x20;   });

&#x20;   invalidateOperationalCaches\_();

&#x20;   return { route: { id: id } };

&#x20; } catch (err) {

&#x20;   // Re-throw structured errors; wrap anything unexpected

&#x20;   if (err \&\& err.httpStatus) throw err;

&#x20;   Logger.log('createRoute error: ' + (err \&\& err.message));

&#x20;   throw apiError\_(500, 'Failed to create route. Please try again.');

&#x20; }

}



function api\_updateRoute\_(params, user) {

&#x20; return withScriptLock\_(function () {

&#x20;   requireScreen\_(user, 'route\_center');

&#x20;   if (!user.capabilities.manageRoutes) throw apiError\_(403, 'Missing capability: manageRoutes');

&#x20;   var routeId = String(params.id || '').trim();

&#x20;   if (!routeId) throw apiError\_(400, 'Route id is required.');



&#x20;   var route = readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTES).filter(function (r) { return r\['Route ID'] === routeId; })\[0];

&#x20;   if (!route || String(route\['Deleted'] || '').toLowerCase() === 'yes') throw apiError\_(404, 'Route not found.');

&#x20;   assertRouteOrgAccess\_(user, route\['Organization']);



&#x20;   var assignments = readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_ASSIGNMENTS)

&#x20;     .filter(function (a) { return a\['Route ID'] === routeId; });

&#x20;   var active = pickActiveRouteAssignment\_(assignments);

&#x20;   var lpIdsExisting = String(route\['LP IDs'] || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);

&#x20;   var execLogs = active

&#x20;     ? readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_EXECUTION\_LOG).filter(function (l) { return l\['Assignment ID'] === active\['Assignment ID']; })

&#x20;     : \[];

&#x20;   var status = deriveRouteWorkflowStatus\_(active, execLogs, lpIdsExisting.length);

&#x20;   if (status === 'In Progress' || status === 'Completed') {

&#x20;     throw apiError\_(409, 'Route cannot be edited while in progress or completed.');

&#x20;   }



&#x20;   ensureRouteSheetColumns\_();

&#x20;   var updates = {};

&#x20;   if (params.name != null) updates\['Name'] = String(params.name).trim();

&#x20;   if (params.frequency != null) {

&#x20;     updates\['Frequency'] = String(params.frequency);

&#x20;     propagateFrequencyToFutureRoutes\_(routeId, String(params.frequency));

&#x20;   }

&#x20;   if (params.oilTypeFilter !== undefined) updates\['Oil Type Filter'] = String(params.oilTypeFilter || '');

&#x20;   if (params.area != null) updates\['Area'] = String(params.area);

&#x20;   if (params.dueDate !== undefined) updates\['Due Date'] = params.dueDate ? new Date(params.dueDate) : '';

&#x20;   if (params.equipmentIds) updates\['Equipment IDs'] = params.equipmentIds.join(', ');



&#x20;   if (params.lpIds) {

&#x20;     var lpIds = params.lpIds;

&#x20;     if (!lpIds.length) throw apiError\_(400, 'At least one lubrication point is required.');

&#x20;     assertLpIdsInContractorScope\_(lpIds, route\['Organization'], user);

&#x20;     updates\['LP IDs'] = lpIds.join(', ');

&#x20;     if (active \&\& active\['Status'] === 'ASSIGNED') {

&#x20;       syncRouteExecLogForAssignment\_(active\['Assignment ID'], lpIds);

&#x20;     }

&#x20;   }



&#x20;   updateRowByKey\_(BOOK.OPERATIONAL, SHEETS.ROUTES, 'Route ID', routeId, updates);



&#x20;   if (params.technicianId \&\& active) {

&#x20;     var tech = resolveTechnicianById\_(params.technicianId);

&#x20;     assertTechnicianInRouteOrg\_(tech.name, route\['Organization']);

&#x20;     updateRowByKey\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_ASSIGNMENTS, 'Assignment ID', active\['Assignment ID'], {

&#x20;       'Technician': tech.name, 'Technician ID': tech.id

&#x20;     });

&#x20;   }



&#x20;   invalidateOperationalCaches\_();

&#x20;   return { success: true };

&#x20; });

}



function api\_deleteRoute\_(params, user) {

&#x20; return withScriptLock\_(function () {

&#x20;   requireScreen\_(user, 'route\_center');

&#x20;   if (!user.capabilities.manageRoutes) throw apiError\_(403, 'Missing capability: manageRoutes');

&#x20;   var routeId = String(params.id || '').trim();

&#x20;   if (!routeId) throw apiError\_(400, 'Route id is required.');



&#x20;   var route = readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTES).filter(function (r) { return r\['Route ID'] === routeId; })\[0];

&#x20;   if (!route || String(route\['Deleted'] || '').toLowerCase() === 'yes') throw apiError\_(404, 'Route not found.');

&#x20;   assertRouteOrgAccess\_(user, route\['Organization']);



&#x20;   var assignments = readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_ASSIGNMENTS)

&#x20;     .filter(function (a) { return a\['Route ID'] === routeId; });

&#x20;   var active = pickActiveRouteAssignment\_(assignments);

&#x20;   var lpIdsExisting = String(route\['LP IDs'] || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);

&#x20;   var execLogs = active

&#x20;     ? readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_EXECUTION\_LOG).filter(function (l) { return l\['Assignment ID'] === active\['Assignment ID']; })

&#x20;     : \[];

&#x20;   var status = deriveRouteWorkflowStatus\_(active, execLogs, lpIdsExisting.length);



&#x20;   if (status === 'In Progress' || status === 'Completed') {

&#x20;     throw apiError\_(409, 'Route cannot be deleted while in progress or completed.');

&#x20;   }

&#x20;   if (status === 'Assigned' \&\& routeHasExecutionRecords\_(active ? active\['Assignment ID'] : null)) {

&#x20;     throw apiError\_(409, 'Route cannot be deleted after execution has started.');

&#x20;   }



&#x20;   ensureRouteSheetColumns\_();

&#x20;   updateRowByKey\_(BOOK.OPERATIONAL, SHEETS.ROUTES, 'Route ID', routeId, { 'Deleted': 'Yes' });

&#x20;   invalidateOperationalCaches\_();

&#x20;   return { success: true };

&#x20; });

}



function api\_assignRoute\_(params, user) {

&#x20; return withScriptLock\_(function () {

&#x20;   requireScreen\_(user, 'route\_center');

&#x20;   if (!user.capabilities.manageRoutes) throw apiError\_(403, 'Missing capability: manageRoutes');

&#x20;   if (!params.assignedDate) throw apiError\_(400, 'assignedDate is required.');

&#x20;   var tech = params.technicianId ? resolveTechnicianById\_(params.technicianId) : null;

&#x20;   var technicianName = tech ? tech.name : String(params.technician || '').trim();

&#x20;   if (!technicianName) throw apiError\_(400, 'technicianId is required.');



&#x20;   var route = readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTES).filter(function (r) { return r\['Route ID'] === params.routeId; })\[0];

&#x20;   if (!route || String(route\['Deleted'] || '').toLowerCase() === 'yes') throw apiError\_(404, 'Route not found.');



&#x20;   assertRouteOrgAccess\_(user, route\['Organization']);

&#x20;   assertTechnicianInRouteOrg\_(technicianName, route\['Organization']);

&#x20;   ensureRouteSheetColumns\_();



&#x20;   var existing = readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_ASSIGNMENTS)

&#x20;     .filter(function (a) { return a\['Route ID'] === params.routeId; });

&#x20;   var active = pickActiveRouteAssignment\_(existing);

&#x20;   if (active \&\& (active\['Status'] === 'ASSIGNED' || active\['Status'] === 'IN\_PROGRESS')) {

&#x20;     throw apiError\_(409, 'Route already has an active assignment. Complete or cancel it before reassigning.');

&#x20;   }



&#x20;   var id = nextSequentialId\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_ASSIGNMENTS, 'Assignment ID', 'ASG-', 4);

&#x20;   appendRowObj\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_ASSIGNMENTS, {

&#x20;     'Assignment ID': id, 'Route ID': params.routeId, 'Technician': technicianName,

&#x20;     'Technician ID': tech ? tech.id : '',

&#x20;     'Assigned Date': new Date(params.assignedDate), 'Status': 'ASSIGNED', 'Started At': '', 'Completed At': ''

&#x20;   });



&#x20;   var lpIds = String(route\['LP IDs'] || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);

&#x20;   lpIds.forEach(function (lpId) {

&#x20;     appendRowObj\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_EXECUTION\_LOG, { 'Assignment ID': id, 'LP ID': lpId, 'Status': 'PENDING', 'Skip Reason': '', 'Completed At': '' });

&#x20;   });



&#x20;   invalidateOperationalCaches\_();

&#x20;   return { assignment: { id: id, routeId: params.routeId, pointCount: lpIds.length } };

&#x20; });

}



function api\_getMyAssignments\_(params, user) {

&#x20; var assignments = readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_ASSIGNMENTS).filter(function (a) { return a\['Technician'] === user.name; });

&#x20; var execLogs = readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_EXECUTION\_LOG);

&#x20; var routes = readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTES);

&#x20; var routeById = {}; routes.forEach(function (r) { routeById\[r\['Route ID']] = r; });



&#x20; return {

&#x20;   assignments: assignments.map(function (a) {

&#x20;     var logs = execLogs.filter(function (l) { return l\['Assignment ID'] === a\['Assignment ID']; });

&#x20;     var route = routeById\[a\['Route ID']] || {};

&#x20;     return { id: a\['Assignment ID'], routeName: route\['Name'] || a\['Route ID'], assignedDate: toIso\_(a\['Assigned Date']), status: a\['Status'], points: logs.map(function (l) { return { lpId: l\['LP ID'], status: l\['Status'] }; }) };

&#x20;   })

&#x20; };

}



function api\_startAssignment\_(params, user) {

&#x20; return withScriptLock\_(function () {

&#x20;   requireScreen\_(user, 'route\_center');

&#x20;   var a = readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_ASSIGNMENTS).filter(function (x) { return x\['Assignment ID'] === params.id; })\[0];

&#x20;   if (!a) throw apiError\_(404, 'Assignment not found.');

&#x20;   var route = readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTES).filter(function (r) { return r\['Route ID'] === a\['Route ID']; })\[0];

&#x20;   if (!route) throw apiError\_(404, 'Route not found for assignment.');

&#x20;   assertRouteOrgAccess\_(user, route\['Organization']);

&#x20;   if (a\['Technician'] !== user.name \&\& !user.capabilities.manageRoutes) {

&#x20;     throw apiError\_(403, 'Not authorized to start this assignment.');

&#x20;   }

&#x20;   updateRowByKey\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_ASSIGNMENTS, 'Assignment ID', params.id, { 'Status': 'IN\_PROGRESS', 'Started At': new Date() });

&#x20;   invalidateOperationalCaches\_();

&#x20;   return { success: true };

&#x20; });

}



function api\_completeAssignmentPoint\_(params, user) {

&#x20; return withScriptLock\_(function () {

&#x20;   var sheet = getSheet\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_EXECUTION\_LOG);

&#x20;   var table = readTable\_(sheet);

&#x20;   var row = table.rows.filter(function (r) { return r\['Assignment ID'] === params.id \&\& r\['LP ID'] === params.lpId; })\[0];

&#x20;   if (!row) throw apiError\_(404, 'Route execution row not found.');

&#x20;   if (row\['Status'] !== 'PENDING') throw apiError\_(400, 'Point is not pending execution.');

&#x20;   \['Status', 'Completed At'].forEach(function (h) {

&#x20;     var colIdx = table.headers.indexOf(h);

&#x20;     sheet.getRange(row.\_\_row, colIdx + 1).setValue(h === 'Status' ? 'DONE' : new Date());

&#x20;   });

&#x20;   SpreadsheetApp.flush();

&#x20;   finalizeRouteAssignmentIfComplete\_(params.id);

&#x20;   invalidateOperationalCaches\_();

&#x20;   return { success: true };

&#x20; });

}



function finalizeRouteAssignmentIfComplete\_(assignmentId) {

&#x20; var logs = readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_EXECUTION\_LOG)

&#x20;   .filter(function (l) { return l\['Assignment ID'] === assignmentId; });

&#x20; if (!logs.length) return;

&#x20; var unresolved = logs.filter(function (l) {

&#x20;   return l\['Status'] === 'PENDING' || l\['Status'] === 'SKIP\_PENDING';

&#x20; }).length;

&#x20; if (unresolved > 0) return;

&#x20; updateRowByKey\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_ASSIGNMENTS, 'Assignment ID', assignmentId, {

&#x20;   'Status': 'COMPLETED', 'Completed At': new Date()

&#x20; });

&#x20; var assignment = readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_ASSIGNMENTS)

&#x20;   .filter(function (a) { return a\['Assignment ID'] === assignmentId; })\[0];

&#x20; if (assignment) {

&#x20;   try { generateNextRecurringRoute\_(assignment\['Route ID'], assignment); } catch (e) {

&#x20;     Logger.log('generateNextRecurringRoute: ' + (e \&\& e.message));

&#x20;   }

&#x20; }

}



function api\_skipAssignmentPoint\_(params, user) {

&#x20; return withScriptLock\_(function () {

&#x20;   ensureRouteExecutionLogColumns\_();

&#x20;   ensureSkipNotificationTypes\_();

&#x20;   var category = params.reasonCategory || params.reason;

&#x20;   validateSkipReason\_(category, params.otherReason);

&#x20;   var reasonText = buildSkipReasonText\_(category, params.otherReason);

&#x20;   var comment = String(params.comment || '').trim();



&#x20;   var ctx = getRouteContextForAssignment\_(params.id);

&#x20;   if (!ctx) throw apiError\_(404, 'Assignment not found.');

&#x20;   assertRouteOrgAccess\_(user, ctx.organization);

&#x20;   if (ctx.assignment\['Technician'] !== user.name \&\& !user.capabilities.manageRoutes) {

&#x20;     throw apiError\_(403, 'Not authorized to skip points on this assignment.');

&#x20;   }



&#x20;   var found = findExecLogRow\_(params.id, params.lpId);

&#x20;   if (!found) throw apiError\_(404, 'Route execution row not found.');

&#x20;   if (found.row\['Status'] !== 'PENDING') throw apiError\_(400, 'Point is not pending execution.');



&#x20;   var updates = {

&#x20;     'Status': 'SKIP\_PENDING',

&#x20;     'Skip Reason': reasonText,

&#x20;     'Skip Comment': comment,

&#x20;     'Skip Requested At': new Date(),

&#x20;     'Skip Requested By': user.name,

&#x20;     'Completed At': ''

&#x20;   };

&#x20;   Object.keys(updates).forEach(function (h) {

&#x20;     var colIdx = found.table.headers.indexOf(h);

&#x20;     if (colIdx === -1) return;

&#x20;     found.sheet.getRange(found.row.\_\_row, colIdx + 1).setValue(updates\[h]);

&#x20;   });

&#x20;   SpreadsheetApp.flush();



&#x20;   notify\_({

&#x20;     typeName: 'Route Skip Requested',

&#x20;     organizationId: ctx.organization,

&#x20;     message: user.name + ' requested skip for ' + params.lpId + ' on route "' + (ctx.route\['Name'] || '') + '": ' + reasonText,

&#x20;     relatedEntityType: 'RouteExecutionLog',

&#x20;     relatedEntityId: params.id

&#x20;   });

&#x20;   invalidateOperationalCaches\_();

&#x20;   return { success: true, status: 'SKIP\_PENDING' };

&#x20; });

}



function assertSkipApprovalAccess\_(user, organization) {

&#x20; if (!user.capabilities.approve \&\& !user.capabilities.reject) {

&#x20;   throw apiError\_(403, 'Missing capability: approve');

&#x20; }

&#x20; if (user.dataScope !== 'ALL\_ORGS' \&\& organization !== user.organizationId) {

&#x20;   throw apiError\_(403, "Not authorized for this organization's data.");

&#x20; }

}



function api\_approveSkipRequest\_(params, user) {

&#x20; if (!user.capabilities.approve) throw apiError\_(403, 'Missing capability: approve');

&#x20; return withScriptLock\_(function () {

&#x20;   ensureRouteExecutionLogColumns\_();

&#x20;   ensureSkipNotificationTypes\_();

&#x20;   var ctx = getRouteContextForAssignment\_(params.id);

&#x20;   if (!ctx) throw apiError\_(404, 'Assignment not found.');

&#x20;   assertSkipApprovalAccess\_(user, ctx.organization);



&#x20;   var found = findExecLogRow\_(params.id, params.lpId);

&#x20;   if (!found) throw apiError\_(404, 'Route execution row not found.');

&#x20;   if (found.row\['Status'] !== 'SKIP\_PENDING') throw apiError\_(400, 'Skip request is not pending approval.');



&#x20;   var updates = {

&#x20;     'Status': 'SKIP\_APPROVED',

&#x20;     'Skip Approved By': user.name,

&#x20;     'Skip Approved At': new Date(),

&#x20;     'Completed At': new Date(),

&#x20;     'Skip Reminder Count': 0

&#x20;   };

&#x20;   Object.keys(updates).forEach(function (h) {

&#x20;     var colIdx = found.table.headers.indexOf(h);

&#x20;     if (colIdx === -1) return;

&#x20;     found.sheet.getRange(found.row.\_\_row, colIdx + 1).setValue(updates\[h]);

&#x20;   });

&#x20;   SpreadsheetApp.flush();



&#x20;   var techEmail = getTechnicianEmailByName\_(ctx.assignment\['Technician']);

&#x20;   notifySkipDecision\_(

&#x20;     'Route Skip Approved',

&#x20;     ctx.organization,

&#x20;     user.name + ' approved skip for ' + params.lpId + ' on route "' + (ctx.route\['Name'] || '') + '". Point remains due/overdue.',

&#x20;     techEmail

&#x20;   );

&#x20;   notify\_({

&#x20;     typeName: 'Route Skip Due Reminder',

&#x20;     organizationId: ctx.organization,

&#x20;     message: '1 skipped point (' + params.lpId + ') on route "' + (ctx.route\['Name'] || '') + '" remains due/overdue.',

&#x20;     relatedEntityType: 'RouteExecutionLog',

&#x20;     relatedEntityId: params.id

&#x20;   });

&#x20;   updateExecLogFields\_(params.id, params.lpId, { 'Skip Reminder Count': 1 });



&#x20;   finalizeRouteAssignmentIfComplete\_(params.id);

&#x20;   invalidateOperationalCaches\_();

&#x20;   return { success: true };

&#x20; });

}



function api\_rejectSkipRequest\_(params, user) {

&#x20; if (!user.capabilities.reject) throw apiError\_(403, 'Missing capability: reject');

&#x20; if (!params.reason) throw apiError\_(400, 'A rejection reason is required.');

&#x20; return withScriptLock\_(function () {

&#x20;   ensureRouteExecutionLogColumns\_();

&#x20;   ensureSkipNotificationTypes\_();

&#x20;   var ctx = getRouteContextForAssignment\_(params.id);

&#x20;   if (!ctx) throw apiError\_(404, 'Assignment not found.');

&#x20;   assertSkipApprovalAccess\_(user, ctx.organization);



&#x20;   var found = findExecLogRow\_(params.id, params.lpId);

&#x20;   if (!found) throw apiError\_(404, 'Route execution row not found.');

&#x20;   if (found.row\['Status'] !== 'SKIP\_PENDING') throw apiError\_(400, 'Skip request is not pending approval.');



&#x20;   var updates = {

&#x20;     'Status': 'PENDING',

&#x20;     'Skip Reason': '',

&#x20;     'Skip Comment': '',

&#x20;     'Skip Requested At': '',

&#x20;     'Skip Requested By': '',

&#x20;     'Skip Rejected By': user.name,

&#x20;     'Skip Rejection Reason': params.reason,

&#x20;     'Completed At': ''

&#x20;   };

&#x20;   Object.keys(updates).forEach(function (h) {

&#x20;     var colIdx = found.table.headers.indexOf(h);

&#x20;     if (colIdx === -1) return;

&#x20;     found.sheet.getRange(found.row.\_\_row, colIdx + 1).setValue(updates\[h]);

&#x20;   });

&#x20;   SpreadsheetApp.flush();



&#x20;   var points = getLpIndex\_();

&#x20;   var lp = points.filter(function (p) { return p.lpIdCode === params.lpId; })\[0];

&#x20;   createSkipRejectionActionPlan\_(ctx, params.lpId, lp, params.reason, user);



&#x20;   var techEmail = getTechnicianEmailByName\_(ctx.assignment\['Technician']);

&#x20;   notifySkipDecision\_(

&#x20;     'Route Skip Rejected',

&#x20;     ctx.organization,

&#x20;     user.name + ' rejected skip for ' + params.lpId + ' on route "' + (ctx.route\['Name'] || '') + '": ' + params.reason,

&#x20;     techEmail

&#x20;   );

&#x20;   invalidateOperationalCaches\_();

&#x20;   return { success: true };

&#x20; });

}



function api\_bulkApproveSkipRequests\_(params, user) {

&#x20; if (!user.capabilities.approve) throw apiError\_(403, 'Missing capability: approve');

&#x20; var items = params.items || \[];

&#x20; if (!items.length) throw apiError\_(400, 'No skip requests selected.');

&#x20; var results = \[];

&#x20; items.forEach(function (item) {

&#x20;   try {

&#x20;     api\_approveSkipRequest\_({ id: item.assignmentId, lpId: item.lpId }, user);

&#x20;     results.push({ assignmentId: item.assignmentId, lpId: item.lpId, success: true });

&#x20;   } catch (e) {

&#x20;     results.push({ assignmentId: item.assignmentId, lpId: item.lpId, success: false, error: e.message || String(e) });

&#x20;   }

&#x20; });

&#x20; return { results: results, approved: results.filter(function (r) { return r.success; }).length };

}



// ─────────────────────────────────────────────────────────────────────────

// FUNCTION REGISTRY — fn name -> { handler, auth, screen, capability }

// auth defaults to true (session token required) unless explicitly false.

// screen/capability, if set, are enforced before the handler runs; handlers

// that already self-check (see comments) leave these unset to avoid a

// redundant check.

// ─────────────────────────────────────────────────────────────────────────



var FUNCTION\_MAP = {

&#x20; // Auth

&#x20; loginUser: { handler: api\_loginUser\_, auth: false },

&#x20; changePassword: { handler: api\_changePassword\_ },

&#x20; getMe: { handler: api\_getMe\_ },



&#x20; // Dashboard

&#x20; getDashboardData: { handler: api\_getDashboardData\_, screen: 'dashboard' },



&#x20; // Lubrication Points

&#x20; getLubricationPoints: { handler: api\_getLubricationPoints\_, screen: 'lubrication\_explorer' },

&#x20; getLubricationPointById: { handler: api\_getLubricationPointById\_, screen: 'lp\_details' },

&#x20; updateLubricationPoint: { handler: api\_updateLubricationPoint\_ },



&#x20; // Lubrication Records

&#x20; submitLubrication: { handler: api\_submitLubrication\_ },

&#x20; getPendingApprovals: { handler: api\_getPendingApprovals\_, screen: 'pending\_approvals' },

&#x20; approveLubrication: { handler: api\_approveLubrication\_ },

&#x20; rejectLubrication: { handler: api\_rejectLubrication\_ },



&#x20; // Action Plans

&#x20; getActionPlans: { handler: api\_getActionPlans\_, screen: 'action\_plan\_center' },

&#x20; createActionPlan: { handler: api\_createActionPlan\_, screen: 'action\_plan\_center' },

&#x20; closeActionPlan: { handler: api\_closeActionPlan\_, screen: 'action\_plan\_center' },

&#x20; updateActionPlanStatus: { handler: api\_updateActionPlanStatus\_, screen: 'action\_plan\_center' },



&#x20; // Notifications

&#x20; getNotifications: { handler: api\_getNotifications\_ },

&#x20; markNotificationRead: { handler: api\_markNotificationRead\_ },

&#x20; markAllNotificationsRead: { handler: api\_markAllNotificationsRead\_ },

&#x20; archiveNotification: { handler: api\_archiveNotification\_ },



&#x20; // Timeline

&#x20; getTimeline: { handler: api\_getTimeline\_, screen: 'lubrication\_timeline' },

&#x20; getLpTimeline: { handler: api\_getLpTimeline\_, screen: 'lubrication\_timeline' },



&#x20; // Settings

&#x20; getSettings: { handler: api\_getSettings\_ },

&#x20; updateSetting: { handler: api\_updateSetting\_ },

&#x20; getPermissionTemplates: { handler: api\_getPermissionTemplates\_ },

&#x20; updatePermissionTemplate: { handler: api\_updatePermissionTemplate\_ },

&#x20; getNotificationRouting: { handler: api\_getNotificationRouting\_ },

&#x20; updateNotificationRouting: { handler: api\_updateNotificationRouting\_ },



&#x20; // Reports

&#x20; getReportsData: { handler: api\_getReportsData\_, screen: 'reports\_center' },



&#x20; // Lookups

&#x20; getLookups: { handler: api\_getLookups\_ },



&#x20; // Users \& Titles

&#x20; getUsers: { handler: api\_getUsers\_ },

&#x20; getTitles: { handler: api\_getTitles\_ },

&#x20; createUser: { handler: api\_createUser\_ },

&#x20; updateUserActive: { handler: api\_updateUserActive\_ },

&#x20; resetUserPassword: { handler: api\_resetUserPassword\_ },  // Rev 3 (F): admin password reset



&#x20; // Audit Log

&#x20; getAuditLog: { handler: api\_getAuditLog\_ },



&#x20; // Oil Management Center

&#x20; getOilConsumption: { handler: api\_getOilConsumption\_ },

&#x20; getOilForecast: { handler: api\_getOilForecast\_ },

&#x20; getOilForecastV2: { handler: api\_getOilForecastV2\_ },

&#x20; getOilForecastDetail: { handler: api\_getOilForecastDetail\_ },

&#x20; getOilMasterList: { handler: api\_getOilMasterList\_ },

&#x20; getPurchaseLog: { handler: api\_getPurchaseLog\_ },

&#x20; createPurchaseLog: { handler: api\_createPurchaseLog\_ },



&#x20; // Oil Sample Center (PDF extraction intentionally not implemented)

&#x20; getOilSamples: { handler: api\_getOilSamples\_ },

&#x20; getOilSampleById: { handler: api\_getOilSampleById\_ },

&#x20; getOilSampleTrend: { handler: api\_getOilSampleTrend\_ },

&#x20; createOilSample: { handler: api\_createOilSample\_ },



&#x20; // Route Center

&#x20; getRoutes: { handler: api\_getRoutes\_ },

&#x20; getDynamicRoutePreview: { handler: api\_getDynamicRoutePreview\_ },

&#x20; uploadOilChangePhoto: { handler: api\_uploadOilChangePhoto\_ },

&#x20; createRoute: { handler: api\_createRoute\_ },

&#x20; updateRoute: { handler: api\_updateRoute\_ },

&#x20; deleteRoute: { handler: api\_deleteRoute\_ },

&#x20; assignRoute: { handler: api\_assignRoute\_ },

&#x20; getMyAssignments: { handler: api\_getMyAssignments\_ },

&#x20; startAssignment: { handler: api\_startAssignment\_ },

&#x20; completeAssignmentPoint: { handler: api\_completeAssignmentPoint\_ },

&#x20; skipAssignmentPoint: { handler: api\_skipAssignmentPoint\_ },

&#x20; approveSkipRequest: { handler: api\_approveSkipRequest\_ },

&#x20; rejectSkipRequest: { handler: api\_rejectSkipRequest\_ },

&#x20; bulkApproveSkipRequests: { handler: api\_bulkApproveSkipRequests\_ }

};



// ─────────────────────────────────────────────────────────────────────────

// ADMIN / ONE-TIME SETUP UTILITIES

// Run these from the Apps Script editor (select the function in the

// dropdown, click Run) — they are not exposed over the Web App.

// ─────────────────────────────────────────────────────────────────────────



/\*\*

&#x20;\* STEP 1 of manual setup. Adds "Password Hash" and "Password Salt" columns

&#x20;\* to the end of the Users tab if they don't already exist. Purely additive

&#x20;\* — does not touch any existing column or any existing row's data in the

&#x20;\* other columns. Safe to run more than once (no-ops if columns exist).

&#x20;\*/

function bootstrapAddPasswordColumns() {

&#x20; var sheet = getSheet\_(BOOK.CONFIG, SHEETS.USERS);

&#x20; var headerRow = findHeaderRow\_(sheet);

&#x20; var lastCol = sheet.getLastColumn();

&#x20; var headers = sheet.getRange(headerRow, 1, 1, lastCol).getValues()\[0];



&#x20; var toAdd = \['Password Hash', 'Password Salt'].filter(function (h) { return headers.indexOf(h) === -1; });

&#x20; toAdd.forEach(function (h, i) {

&#x20;   sheet.getRange(headerRow, lastCol + 1 + i).setValue(h);

&#x20; });

&#x20; SpreadsheetApp.flush();

&#x20; Logger.log(toAdd.length ? ('Added columns: ' + toAdd.join(', ')) : 'Password Hash / Password Salt already present — nothing to do.');

}



/\*\*

&#x20;\* STEP 2 of manual setup. Sets (or resets) one user's password. Run once

&#x20;\* per existing account after bootstrapAddPasswordColumns, e.g.:

&#x20;\*   adminSetPassword\_('superadmin@acc-oil.app', 'ChangeMe123!');

&#x20;\* Every user should change this password on first login (the Users tab's

&#x20;\* "Must Change Password" column already controls that prompt).

&#x20;\*/

function adminSetPassword\_(email, newPassword) {

&#x20; var userRow = findUserRowByEmail\_(email);

&#x20; if (!userRow) throw new Error('No user found with email: ' + email);

&#x20; var salt = makeSalt\_();

&#x20; var hash = hashPassword\_(newPassword, salt);

&#x20; updateRowByKey\_(BOOK.CONFIG, SHEETS.USERS, 'Email', email, { 'Password Hash': hash, 'Password Salt': salt });

&#x20; Logger.log('Password set for ' + email);

}



// ─────────────────────────────────────────────────────────────────────────

// Rev 3 (F): Admin Password Reset — exposed as a Web App API

// ─────────────────────────────────────────────────────────────────────────



/\*\*

&#x20;\* Generates a secure random temporary password.

&#x20;\* Format: Acc@<random 8 alphanumeric chars>

&#x20;\* Never stored in plaintext — only returned once to the caller.

&#x20;\*/

function makeTempPassword\_() {

&#x20; var chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

&#x20; var result = 'Acc@';

&#x20; for (var i = 0; i < 8; i++) {

&#x20;   result += chars\[Math.floor(Math.random() \* chars.length)];

&#x20; }

&#x20; return result;

}



/\*\*

&#x20;\* API handler: resets a target user's password to a secure random temporary

&#x20;\* password. The caller must have manageUsers capability. The temporary

&#x20;\* password is returned ONCE and never stored in plaintext.

&#x20;\*

&#x20;\* Called via: POST /users/:id/reset-password  (id = target email)

&#x20;\*/

function api\_resetUserPassword\_(params, user) {

&#x20; requireScreen\_(user, 'settings');

&#x20; if (!user.capabilities.manageUsers) throw apiError\_(403, 'Missing capability: manageUsers');



&#x20; var targetEmail = String(params.id || '').trim();

&#x20; if (!targetEmail) throw apiError\_(400, 'Target user email (id) is required.');



&#x20; var targetRow = findUserRowByEmail\_(targetEmail);

&#x20; if (!targetRow) throw apiError\_(404, 'User not found: ' + targetEmail);



&#x20; // Super Admins can reset anyone; others can only reset within their org

&#x20; if (user.titleName !== 'Super Admin') {

&#x20;   var titles = readRows\_(BOOK.CONFIG, SHEETS.TITLES);

&#x20;   var orgByTitle = {};

&#x20;   titles.forEach(function (t) { orgByTitle\[t\['Title Name']] = t\['Organization']; });

&#x20;   var targetOrg = orgByTitle\[targetRow\['Title']];

&#x20;   if (targetOrg !== user.organizationId) {

&#x20;     throw apiError\_(403, 'You can only reset passwords for users in your organization.');

&#x20;   }

&#x20; }



&#x20; var tempPassword = makeTempPassword\_();

&#x20; var salt = makeSalt\_();

&#x20; var hash = hashPassword\_(tempPassword, salt);



&#x20; updateRowByKey\_(BOOK.CONFIG, SHEETS.USERS, 'Email', targetEmail, {

&#x20;   'Password Hash': hash,

&#x20;   'Password Salt': salt,

&#x20;   'Must Change Password': 'Yes'

&#x20; });



&#x20; Logger.log('Password reset by ' + user.email + ' for ' + targetEmail);



&#x20; // Return plaintext ONCE — it is never persisted

&#x20; return { temporaryPassword: tempPassword };

}



// ─────────────────────────────────────────────────────────────────────────

// Rev 3 (G): Emergency Super Admin Recovery — KEEP PERMANENTLY

// ─────────────────────────────────────────────────────────────────────────



/\*\*

&#x20;\* EMERGENCY RECOVERY ONLY — Do not call in normal operation.

&#x20;\* Run from the Apps Script editor (select in dropdown, click Run) to

&#x20;\* restore access when the Super Admin password is unknown.

&#x20;\* This function is intentionally NOT exposed via the Web App API.

&#x20;\*/

function resetSuperAdminPassword() {

&#x20; adminSetPassword\_(

&#x20;   'superadmin@acc-oil.app',

&#x20;   'Acc@2026Admin!'

&#x20; );

&#x20; Logger.log('Super Admin password reset to default. Change it immediately after login.');

}





/\*\* Convenience: sets the same temporary password for every existing user in

&#x20;\* one pass. Each account still has "Must Change Password" = Yes (per the

&#x20;\* existing sheet data), so everyone is forced to pick their own on first

&#x20;\* login. Run this ONCE right after bootstrapAddPasswordColumns. \*/

function bootstrapSetAllInitialPasswords\_(temporaryPassword) {

&#x20; var users = readRows\_(BOOK.CONFIG, SHEETS.USERS);

&#x20; users.forEach(function (u) { adminSetPassword\_(u\['Email'], temporaryPassword || 'AccOil2026!'); });

&#x20; Logger.log('Initial password set for ' + users.length + ' users.');

}



/\*\* Generates a random value suitable for the TOKEN\_SECRET script property. \*/

function generateTokenSecret\_() {

&#x20; var secret = Utilities.getUuid() + Utilities.getUuid();

&#x20; Logger.log('Paste this into Script Properties as TOKEN\_SECRET:\\n' + secret);

&#x20; return secret;

}



/\*\* Adds a small "ACC Oil Admin" menu to the bound Sheet's UI for the common

&#x20;\* one-time setup actions, so a non-developer can run them without opening

&#x20;\* the Apps Script editor's function dropdown. \*/

function onOpen() {

&#x20; SpreadsheetApp.getUi()

&#x20;   .createMenu('ACC Oil Admin')

&#x20;   .addItem('1. Add password columns to Users', 'bootstrapAddPasswordColumns')

&#x20;   .addItem('2. Set a user password…', 'promptSetPassword\_')

&#x20;   .addItem('3. Generate a new TOKEN\_SECRET (logs it — copy into Script Properties)', 'generateTokenSecret\_')

&#x20;   .addToUi();

}



function promptSetPassword\_() {

&#x20; var ui = SpreadsheetApp.getUi();

&#x20; var emailResp = ui.prompt('Set user password', 'User email:', ui.ButtonSet.OK\_CANCEL);

&#x20; if (emailResp.getSelectedButton() !== ui.Button.OK) return;

&#x20; var pwResp = ui.prompt('Set user password', 'New password (min 8 chars):', ui.ButtonSet.OK\_CANCEL);

&#x20; if (pwResp.getSelectedButton() !== ui.Button.OK) return;

&#x20; try {

&#x20;   adminSetPassword\_(emailResp.getResponseText().trim(), pwResp.getResponseText());

&#x20;   ui.alert('Password set for ' + emailResp.getResponseText().trim());

&#x20; } catch (e) {

&#x20;   ui.alert('Error: ' + e.message);

&#x20; }

}



// ══════════════════════════════════════════════════════════════════════════════

// REVISION GROUP 2 — Oil Management Center Enhancement

// ══════════════════════════════════════════════════════════════════════════════



// ── Shared: resolve period in days ────────────────────────────────────────────

function resolvePeriodDays\_(period) {

&#x20; if (period === '3m') return 90;

&#x20; if (period === '6m') return 180;

&#x20; return 30;

}



// ── Shared: get LP rows due within N days ─────────────────────────────────────

function getLpsDueInPeriod\_(points, periodDays) {

&#x20; var today = new Date(); today.setHours(0,0,0,0);

&#x20; var cutoff = new Date(today); cutoff.setDate(cutoff.getDate() + periodDays);

&#x20; return points.filter(function (p) {

&#x20;   if (String(p.frequencyType || '').toLowerCase() !== 'calendar') return false;

&#x20;   var status = computeLubricationStatus\_(lpStatusInput\_(p));

&#x20;   if (status.bucket === 'OVERDUE') return true;

&#x20;   if (!status.nextDue) return false;

&#x20;   var nd = status.nextDue instanceof Date ? status.nextDue : new Date(status.nextDue);

&#x20;   return nd <= cutoff;

&#x20; });

}



// ── Forecast summary (KPI totals + charts) ────────────────────────────────────

function api\_getOilForecastV2\_(params, user) {

&#x20; requireScreen\_(user, 'oil\_management\_center');

&#x20; var orgId = user.dataScope === 'ALL\_ORGS' ? (params.contractor || null) : user.organizationId;

&#x20; var periodDays = resolvePeriodDays\_(params.period);

&#x20; var points = filterLpByOrg\_(getLpIndex\_(), orgId);

&#x20; var dueLps = getLpsDueInPeriod\_(points, periodDays);



&#x20; // By oil type

&#x20; var byType = {};

&#x20; dueLps.forEach(function (p) {

&#x20;   var key = p.lubricantType || 'Unspecified';

&#x20;   byType\[key] = (byType\[key] || 0) + (p.standardQuantityL || 0);

&#x20; });

&#x20; var byTypeRows = Object.keys(byType).map(function (k) {

&#x20;   return { lubricantType: k, quantityL: Math.round(byType\[k] \* 10) / 10 };

&#x20; }).sort(function (a,b) { return b.quantityL - a.quantityL; });



&#x20; // By month

&#x20; var today2 = new Date(); today2.setHours(0,0,0,0);

&#x20; var byMonth = {};

&#x20; dueLps.forEach(function (p) {

&#x20;   var status = computeLubricationStatus\_(lpStatusInput\_(p));

&#x20;   var dueDate = (status.nextDue instanceof Date ? status.nextDue : (status.nextDue ? new Date(status.nextDue) : today2));

&#x20;   if (dueDate < today2) dueDate = today2;

&#x20;   var mk = dueDate.getFullYear() + '-' + String(dueDate.getMonth()+1).padStart(2,'0');

&#x20;   byMonth\[mk] = (byMonth\[mk] || 0) + (p.standardQuantityL || 0);

&#x20; });

&#x20; var byMonthRows = Object.keys(byMonth).sort().map(function (k) {

&#x20;   var parts = k.split('-');

&#x20;   var d = new Date(parseInt(parts\[0]), parseInt(parts\[1])-1, 1);

&#x20;   var label = d.toLocaleString('en-US', { month:'short', year:'numeric' });

&#x20;   return { month: k, label: label, quantityL: Math.round(byMonth\[k]\*10)/10 };

&#x20; });



&#x20; // By contractor

&#x20; var byContr = {};

&#x20; dueLps.forEach(function (p) {

&#x20;   var key = p.contractor || 'Unknown';

&#x20;   byContr\[key] = (byContr\[key] || 0) + (p.standardQuantityL || 0);

&#x20; });

&#x20; var byContrRows = Object.keys(byContr).map(function (k) {

&#x20;   return { contractor: k, quantityL: Math.round(byContr\[k]\*10)/10 };

&#x20; });



&#x20; var totalL = Math.round(dueLps.reduce(function (s,p) { return s+(p.standardQuantityL||0); }, 0)\*10)/10;

&#x20; return { totalL: totalL, byType: byTypeRows, byMonth: byMonthRows, byContractor: byContrRows };

}



// ── Forecast detail rows (popup modal) ────────────────────────────────────────

function api\_getOilForecastDetail\_(params, user) {

&#x20; requireScreen\_(user, 'oil\_management\_center');

&#x20; var orgId = user.dataScope === 'ALL\_ORGS' ? (params.contractor || null) : user.organizationId;

&#x20; var periodDays = resolvePeriodDays\_(params.period);

&#x20; var points = filterLpByOrg\_(getLpIndex\_(), orgId);

&#x20; var dueLps = getLpsDueInPeriod\_(points, periodDays);



&#x20; if (params.area)     dueLps = dueLps.filter(function(p){ return p.areaName===params.area; });

&#x20; if (params.oilType)  dueLps = dueLps.filter(function(p){ return p.lubricantType===params.oilType; });

&#x20; if (params.equipment){

&#x20;   var eq = String(params.equipment).toLowerCase();

&#x20;   dueLps = dueLps.filter(function(p){

&#x20;     return (p.equipmentIdCode||'').toLowerCase().indexOf(eq)!==-1||

&#x20;            (p.assetName||'').toLowerCase().indexOf(eq)!==-1;

&#x20;   });

&#x20; }

&#x20; if (params.contractor\_filter){

&#x20;   dueLps = dueLps.filter(function(p){ return p.contractor===params.contractor\_filter; });

&#x20; }



&#x20; var today3 = new Date(); today3.setHours(0,0,0,0);

&#x20; var rows = dueLps.map(function(p){

&#x20;   var status = computeLubricationStatus\_(lpStatusInput\_(p));

&#x20;   var nd = status.nextDue instanceof Date ? status.nextDue : (status.nextDue ? new Date(status.nextDue) : null);

&#x20;   return {

&#x20;     dueDate:      nd ? nd.toISOString().slice(0,10) : 'Overdue',

&#x20;     equipmentId:  p.equipmentIdCode,

&#x20;     equipmentName:p.assetName,

&#x20;     lpId:         p.lpIdCode,

&#x20;     pointDesc:    p.pointDescription,

&#x20;     area:         p.areaName,

&#x20;     contractor:   p.contractor,

&#x20;     oilType:      p.lubricantType,

&#x20;     requiredQtyL: p.standardQuantityL || 0,

&#x20;     frequency:    p.frequencyLabel

&#x20;   };

&#x20; }).sort(function(a,b){

&#x20;   if(a.dueDate==='Overdue') return -1;

&#x20;   if(b.dueDate==='Overdue') return 1;

&#x20;   return a.dueDate.localeCompare(b.dueDate);

&#x20; });



&#x20; var totalL = Math.round(rows.reduce(function(s,r){ return s+r.requiredQtyL; },0)\*10)/10;

&#x20; return { rows: rows, totalL: totalL };

}



// ── Oil Master List with forecast columns ─────────────────────────────────────

function api\_getOilMasterList\_(params, user) {

&#x20; requireScreen\_(user, 'oil\_management\_center');

&#x20; var orgId = user.dataScope === 'ALL\_ORGS' ? (params.contractor || null) : user.organizationId;

&#x20; var allPoints = filterLpByOrg\_(getLpIndex\_(), orgId);

&#x20; var lts = readRows\_(BOOK.CONFIG, SHEETS.LUBRICANT\_TYPES);



&#x20; var result = lts.map(function(lt){

&#x20;   var name = lt\['Name'];

&#x20;   var pts = allPoints.filter(function(p){ return p.lubricantType===name; });

&#x20;   var d30  = getLpsDueInPeriod\_(pts, 30);

&#x20;   var d90  = getLpsDueInPeriod\_(pts, 90);

&#x20;   var d180 = getLpsDueInPeriod\_(pts, 180);

&#x20;   var sum  = function(arr){ return Math.round(arr.reduce(function(s,p){ return s+(p.standardQuantityL||0); },0)\*10)/10; };

&#x20;   return {

&#x20;     id:            name,

&#x20;     name:          name,

&#x20;     brand:         lt\['Brand']     || null,

&#x20;     isoGrade:      lt\['ISO Grade'] || null,

&#x20;     oilType:       lt\['Oil Type']  || null,

&#x20;     usedPoints:    pts.length,

&#x20;     totalCapacityL:Math.round(pts.reduce(function(s,p){ return s+(p.standardQuantityL||0); },0)\*10)/10,

&#x20;     required30L:   sum(d30),

&#x20;     required90L:   sum(d90),

&#x20;     required180L:  sum(d180)

&#x20;   };

&#x20; });



&#x20; if (params.brand)  result = result.filter(function(r){ return r.brand===params.brand; });

&#x20; if (params.oilType)result = result.filter(function(r){ return r.oilType===params.oilType; });

&#x20; if (params.search){

&#x20;   var q = String(params.search).toLowerCase();

&#x20;   result = result.filter(function(r){ return r.name.toLowerCase().indexOf(q)!==-1; });

&#x20; }

&#x20; return { oils: result };

}



// ══════════════════════════════════════════════════════════════════════════════

// REVISION GROUP 3 — Lubrication Timeline

// ══════════════════════════════════════════════════════════════════════════════



/\*\*

&#x20;\* api\_getLpTimeline\_

&#x20;\* Returns enriched chronological events for ONE lubrication point (mode=lp)

&#x20;\* or ALL lubrication points on ONE equipment (mode=equipment).

&#x20;\*

&#x20;\* Params:

&#x20;\*   lpId          — LP ID code (mode=lp)

&#x20;\*   equipmentId   — Equipment code (mode=equipment)

&#x20;\*   eventType     — filter: OIL\_CHANGE | OIL\_SAMPLE | ACTION | CONFIG\_CHANGE | ROUTE

&#x20;\*   from / to     — ISO date strings

&#x20;\*   page / pageSize — pagination (default pageSize=50)

&#x20;\*/

/\*\*

&#x20;\* api\_getLpTimeline\_ — Performance-optimized version

&#x20;\*

&#x20;\* Key changes vs original:

&#x20;\*   1. Default date range: last 12 months (avoids reading all-time history)

&#x20;\*   2. Single-pass reads: each sheet opened ONCE, results reused for both

&#x20;\*      events AND KPI counts (no duplicate readRows\_ calls)

&#x20;\*   3. Per-event-type lazy loading: if caller passes eventType, skip unneeded sheets entirely

&#x20;\*   4. Timeout-safe: wraps in try/catch with clear error message

&#x20;\*   5. Execution time logged for diagnostics

&#x20;\*/

function api\_getLpTimeline\_(params, user) {

&#x20; var t0 = Date.now();

&#x20; try {

&#x20;   requireScreen\_(user, 'lubrication\_timeline');



&#x20;   var lpId    = params.lpId        || null;

&#x20;   var equipId = params.equipmentId || null;

&#x20;   if (!lpId \&\& !equipId) throw apiError\_(400, 'lpId or equipmentId is required.');



&#x20;   var points   = getLpIndex\_();

&#x20;   var equipMap = getEquipmentMap\_();



&#x20;   // Resolve LP scope

&#x20;   var scopedLps;

&#x20;   if (lpId) {

&#x20;     scopedLps = points.filter(function(p){ return p.lpIdCode === lpId; });

&#x20;     if (!scopedLps.length) throw apiError\_(404, 'Lubrication point not found.');

&#x20;   } else {

&#x20;     scopedLps = points.filter(function(p){ return p.equipmentIdCode === equipId; });

&#x20;     if (!scopedLps.length) throw apiError\_(404, 'No lubrication points found for equipment.');

&#x20;   }



&#x20;   // Contractor isolation

&#x20;   scopedLps = scopedLps.filter(function(p){

&#x20;     return user.dataScope === 'ALL\_ORGS' || p.contractor === user.organizationId;

&#x20;   });

&#x20;   if (!scopedLps.length) throw apiError\_(403, 'Not authorized for this data.');



&#x20;   var lpIds  = scopedLps.map(function(p){ return p.lpIdCode; });

&#x20;   var lpById = {};

&#x20;   scopedLps.forEach(function(p){ lpById\[p.lpIdCode] = p; });

&#x20;   var primaryLp = lpId ? lpById\[lpId] : scopedLps\[0];

&#x20;   var equipInfo = equipMap\[primaryLp.equipmentIdCode] || {};



&#x20;   // ── Date range: default last 12 months ──────────────────────────────────

&#x20;   var today    = new Date(); today.setHours(0,0,0,0);

&#x20;   var defaultFrom = new Date(today); defaultFrom.setFullYear(defaultFrom.getFullYear() - 1);

&#x20;   var fromDate = params.from ? new Date(params.from) : defaultFrom;

&#x20;   var toDate   = params.to   ? new Date(params.to + 'T23:59:59') : new Date(today.getTime() + 365\*86400000);

&#x20;   var inRange  = function(d){ return d \&\& d >= fromDate \&\& d <= toDate; };



&#x20;   var wantType = params.eventType || 'ALL';

&#x20;   var wants    = function(t){ return wantType === 'ALL' || wantType === t; };



&#x20;   var events = \[];



&#x20;   // ── Read sheets ONCE, reuse for both events and KPIs ────────────────────

&#x20;   // Each sheet is read at most once per request.



&#x20;   // --- Oil Change History ---

&#x20;   var allHistory = \[];

&#x20;   if (wants('OIL\_CHANGE') || true) { // always need for KPIs

&#x20;     allHistory = readRows\_(BOOK.OPERATIONAL, SHEETS.LUBRICATION\_HISTORY)

&#x20;       .filter(function(h){ return lpIds.indexOf(h\['LP ID']) !== -1; });

&#x20;   }

&#x20;   if (wants('OIL\_CHANGE')) {

&#x20;     allHistory.filter(function(h){ return inRange(toDateOrNull\_(h\['Submitted At'])); })

&#x20;       .forEach(function(h){

&#x20;         var lp = lpById\[h\['LP ID']];

&#x20;         var submittedAt = toDateOrNull\_(h\['Submitted At']);

&#x20;         events.push({

&#x20;           id: 'oc-' + h\['Record ID'], eventType: 'OIL\_CHANGE',

&#x20;           timestamp: toIso\_(submittedAt),

&#x20;           lpId: lp.lpIdCode, lpDesc: lp.pointDescription, equipmentId: lp.equipmentIdCode,

&#x20;           actor: h\['Technician'] || null, actorRole: 'Technician', status: h\['Status'],

&#x20;           detail: {

&#x20;             recordId: h\['Record ID'],

&#x20;             date: toIso\_(toDateOrNull\_(h\['Lubrication Date'])),

&#x20;             oilType: h\['Oil Type Used'] || null,

&#x20;             quantityL: h\['Quantity Used (L)'] === '' ? null : h\['Quantity Used (L)'],

&#x20;             runningHours: h\['Running Hours'] === '' ? null : h\['Running Hours'],

&#x20;             remarks: h\['Remarks'] || null,

&#x20;             approvedBy: h\['Approved By'] || null,

&#x20;             approvedAt: toIso\_(toDateOrNull\_(h\['Approved At'])),

&#x20;             photoUrl: h\['Photo URL'] || null,

&#x20;             photoFileId: h\['Photo File ID'] || null,

&#x20;             isLegacy: h\['Legacy Import'] === 'Yes'

&#x20;           }

&#x20;         });

&#x20;       });

&#x20;   }



&#x20;   // --- Oil Samples ---

&#x20;   var allSamples = \[];

&#x20;   if (wants('OIL\_SAMPLE') || true) { // always need for KPIs

&#x20;     allSamples = readRows\_(BOOK.OPERATIONAL, SHEETS.OIL\_SAMPLES)

&#x20;       .filter(function(s){ return lpIds.indexOf(s\['LP ID']) !== -1; });

&#x20;   }

&#x20;   if (wants('OIL\_SAMPLE')) {

&#x20;     allSamples.filter(function(s){

&#x20;       var d = toDateOrNull\_(s\['Sampled Date']) || toDateOrNull\_(s\['Uploaded At']);

&#x20;       return inRange(d);

&#x20;     }).forEach(function(s){

&#x20;       var lp = lpById\[s\['LP ID']];

&#x20;       var sampledAt = toDateOrNull\_(s\['Sampled Date']) || toDateOrNull\_(s\['Uploaded At']);

&#x20;       events.push({

&#x20;         id: 'os-' + s\['Lab Sample ID'], eventType: 'OIL\_SAMPLE',

&#x20;         timestamp: toIso\_(sampledAt),

&#x20;         lpId: lp.lpIdCode, lpDesc: lp.pointDescription, equipmentId: lp.equipmentIdCode,

&#x20;         actor: s\['Uploaded By'] || null, actorRole: 'Technician', status: s\['Report Status'] || null,

&#x20;         detail: {

&#x20;           sampleId: s\['Lab Sample ID'], sampledDate: toIso\_(toDateOrNull\_(s\['Sampled Date'])),

&#x20;           reportStatus: s\['Report Status'] || null,

&#x20;           recommendations: s\['Recommendations'] || null,

&#x20;           pdfUrl: s\['Source PDF URL'] || null, uploadedBy: s\['Uploaded By'] || null

&#x20;         }

&#x20;       });

&#x20;     });

&#x20;   }



&#x20;   // --- Actions ---

&#x20;   var allActions = \[];

&#x20;   if (wants('ACTION') || true) { // always need for KPIs

&#x20;     allActions = readRows\_(BOOK.OPERATIONAL, SHEETS.ACTION\_PLANS)

&#x20;       .filter(function(a){ return a\['Equipment'] === primaryLp.equipmentIdCode; });

&#x20;   }

&#x20;   if (wants('ACTION')) {

&#x20;     allActions.filter(function(a){ return inRange(toDateOrNull\_(a\['Created At'])); })

&#x20;       .forEach(function(a){

&#x20;         events.push({

&#x20;           id: 'ap-' + a\['Action ID'], eventType: 'ACTION',

&#x20;           timestamp: toIso\_(toDateOrNull\_(a\['Created At'])),

&#x20;           lpId: lpIds\[0], lpDesc: primaryLp.pointDescription, equipmentId: primaryLp.equipmentIdCode,

&#x20;           actor: a\['Created By'] || null, actorRole: 'Reliability Eng.', status: a\['Status'],

&#x20;           detail: {

&#x20;             actionId: a\['Action ID'], actionType: a\['Action Type'],

&#x20;             description: a\['Description'], priority: a\['Priority'] || null,

&#x20;             owner: a\['Owner'] || null,

&#x20;             dueDate: toIso\_(toDateOrNull\_(a\['Due Date'])),

&#x20;             closedDate: toIso\_(toDateOrNull\_(a\['Closed Date'])),

&#x20;             closure: a\['Closure Comments'] || null

&#x20;           }

&#x20;         });

&#x20;       });

&#x20;   }



&#x20;   // --- Config Changes (Audit Log) — only if explicitly requested, it's the largest sheet ---

&#x20;   if (wants('CONFIG\_CHANGE')) {

&#x20;     readRows\_(BOOK.OPERATIONAL, SHEETS.AUDIT\_LOG)

&#x20;       .filter(function(e){

&#x20;         return e\['Action Category'] === 'DATA\_EDIT' \&\&

&#x20;                e\['Entity Type'] === 'LubricationPoint' \&\&

&#x20;                lpIds.indexOf(e\['Entity ID']) !== -1 \&\&

&#x20;                inRange(toDateOrNull\_(e\['Timestamp']));

&#x20;       }).forEach(function(e){

&#x20;         var ts = toDateOrNull\_(e\['Timestamp']);

&#x20;         var before = {}; try { before = JSON.parse(e\['Before Value'] || '{}'); } catch(ex){}

&#x20;         var after  = {}; try { after  = JSON.parse(e\['After Value']  || '{}'); } catch(ex){}

&#x20;         events.push({

&#x20;           id: 'cfg-' + e\['Log ID'], eventType: 'CONFIG\_CHANGE',

&#x20;           timestamp: toIso\_(ts),

&#x20;           lpId: e\['Entity ID'],

&#x20;           lpDesc: lpById\[e\['Entity ID']] ? lpById\[e\['Entity ID']].pointDescription : null,

&#x20;           equipmentId: primaryLp.equipmentIdCode,

&#x20;           actor: e\['Actor Email'], actorRole: 'Reliability Eng.', status: null,

&#x20;           detail: { changedBy: e\['Actor Email'], reason: e\['Reason'] || null, before: before, after: after }

&#x20;         });

&#x20;       });

&#x20;   }



&#x20;   // --- Routes ---

&#x20;   var allRoutes = \[], allAssign = \[];

&#x20;   if (wants('ROUTE') || true) { // need for KPIs

&#x20;     allRoutes = readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTES);

&#x20;     allAssign = readRows\_(BOOK.OPERATIONAL, SHEETS.ROUTE\_ASSIGNMENTS);

&#x20;   }

&#x20;   var routeById = {};

&#x20;   allRoutes.forEach(function(r){ routeById\[r\['Route ID']] = r; });



&#x20;   // Routes whose LP list overlaps our LPs

&#x20;   var relevantRouteIds = {};

&#x20;   allRoutes.forEach(function(r){

&#x20;     var rLps = String(r\['LP IDs']||'').split(',').map(function(s){return s.trim();});

&#x20;     if (rLps.some(function(id){ return lpIds.indexOf(id)!==-1; })) relevantRouteIds\[r\['Route ID']] = true;

&#x20;   });

&#x20;   var relevantAssign = allAssign.filter(function(a){ return relevantRouteIds\[a\['Route ID']]; });



&#x20;   if (wants('ROUTE')) {

&#x20;     relevantAssign.filter(function(a){

&#x20;       var d = toDateOrNull\_(a\['Completed At']) || toDateOrNull\_(a\['Started At']);

&#x20;       return inRange(d);

&#x20;     }).forEach(function(a){

&#x20;       var route = routeById\[a\['Route ID']];

&#x20;       if (!route) return;

&#x20;       var eventDate = toDateOrNull\_(a\['Completed At']) || toDateOrNull\_(a\['Started At']);

&#x20;       // Completion %: use assignment status as proxy (avoid reading ROUTE\_EXECUTION\_LOG)

&#x20;       var pct = a\['Status'] === 'COMPLETED' ? 100 : a\['Status'] === 'IN\_PROGRESS' ? 50 : 0;

&#x20;       events.push({

&#x20;         id: 'rt-' + a\['Assignment ID'], eventType: 'ROUTE',

&#x20;         timestamp: toIso\_(eventDate),

&#x20;         lpId: lpIds\[0], lpDesc: primaryLp.pointDescription, equipmentId: primaryLp.equipmentIdCode,

&#x20;         actor: a\['Technician'] || null, actorRole: 'Technician', status: a\['Status'],

&#x20;         detail: {

&#x20;           assignmentId: a\['Assignment ID'], routeId: a\['Route ID'],

&#x20;           routeName: route\['Name'] || a\['Route ID'],

&#x20;           technician: a\['Technician'], assignedDate: toIso\_(toDateOrNull\_(a\['Assigned Date'])),

&#x20;           status: a\['Status'], completionPct: pct

&#x20;         }

&#x20;       });

&#x20;     });

&#x20;   }



&#x20;   // ── Sort descending ──────────────────────────────────────────────────────

&#x20;   events.sort(function(a,b){ return (b.timestamp||'').localeCompare(a.timestamp||''); });



&#x20;   // ── Pagination ───────────────────────────────────────────────────────────

&#x20;   var pageSize = Math.min(parseInt(params.pageSize||'30',10), 100);

&#x20;   var page     = Math.max(0, parseInt(params.page||'0',10));

&#x20;   var total    = events.length;

&#x20;   var paged    = events.slice(page\*pageSize, (page+1)\*pageSize);



&#x20;   // ── LP context ───────────────────────────────────────────────────────────

&#x20;   var lubStatus  = computeLubricationStatus\_(lpStatusInput\_(primaryLp));

&#x20;   var daysRemaining = lubStatus.nextDue

&#x20;     ? Math.round((new Date(lubStatus.nextDue) - today) / 86400000) : null;



&#x20;   // ── KPIs — reuse already-read arrays, no re-reads ────────────────────────

&#x20;   var lastChangeRow = allHistory

&#x20;     .filter(function(h){ return h\['Status']==='APPROVED'; })

&#x20;     .sort(function(a,b){ return toDateOrNull\_(b\['Lubrication Date'])-toDateOrNull\_(a\['Lubrication Date']); })\[0];

&#x20;   var lastChangeDate = lastChangeRow ? toIso\_(toDateOrNull\_(lastChangeRow\['Lubrication Date'])) : null;



&#x20;   var openActionCount = allActions.filter(function(a){

&#x20;     return \['OPEN','IN\_PROGRESS'].indexOf(a\['Status'])!==-1;

&#x20;   }).length;



&#x20;   var overdueCount = scopedLps.filter(function(p){

&#x20;     return computeLubricationStatus\_(lpStatusInput\_(p)).bucket==='OVERDUE';

&#x20;   }).length;



&#x20;   var firstRecord = allHistory.reduce(function(min,h){

&#x20;     var d = toDateOrNull\_(h\['Lubrication Date']);

&#x20;     return (!min||(d\&\&d<min)) ? d : min;

&#x20;   }, null);



&#x20;   var routeCompletions = relevantAssign.filter(function(a){ return a\['Status']==='COMPLETED'; }).length;



&#x20;   // ── Upcoming events ───────────────────────────────────────────────────────

&#x20;   var upcoming = \[];

&#x20;   var nd = lubStatus.nextDue ? (lubStatus.nextDue instanceof Date ? lubStatus.nextDue : new Date(lubStatus.nextDue)) : null;

&#x20;   if (nd) upcoming.push({ type:'OIL\_CHANGE', date:toIso\_(nd), daysFromNow:Math.round((nd-today)/86400000), label:'Oil Change' });

&#x20;   if (primaryLp.oaRequired) {

&#x20;     var oaStatus = computeOilAnalysisStatus\_(lpStatusInput\_(primaryLp));

&#x20;     if (oaStatus \&\& oaStatus.nextDue) {

&#x20;       var oaDate = oaStatus.nextDue instanceof Date ? oaStatus.nextDue : new Date(oaStatus.nextDue);

&#x20;       upcoming.push({ type:'OIL\_SAMPLE', date:toIso\_(oaDate), daysFromNow:Math.round((oaDate-today)/86400000), label:'Oil Sample' });

&#x20;     }

&#x20;   }

&#x20;   var nextAssign = relevantAssign.filter(function(a){ return a\['Status']==='PENDING'; })

&#x20;     .sort(function(a,b){ return toDateOrNull\_(a\['Assigned Date'])-toDateOrNull\_(b\['Assigned Date']); })\[0];

&#x20;   if (nextAssign) {

&#x20;     var ad = toDateOrNull\_(nextAssign\['Assigned Date']);

&#x20;     upcoming.push({ type:'ROUTE', date:toIso\_(ad), daysFromNow:ad?Math.round((ad-today)/86400000):null, label:'Route' });

&#x20;   }

&#x20;   upcoming.sort(function(a,b){ return (a.daysFromNow||999)-(b.daysFromNow||999); });



&#x20;   // ── Attached documents ────────────────────────────────────────────────────

&#x20;   var attachedDocs = \[];

&#x20;   allHistory.filter(function(h){ return h\['Photo URL']; }).forEach(function(h){

&#x20;     attachedDocs.push({ type:'photo', label:'Oil Change Photo – '+toIso\_(toDateOrNull\_(h\['Lubrication Date'])).slice(0,10)+'.jpg', url:h\['Photo URL'] });

&#x20;   });

&#x20;   allSamples.filter(function(s){ return s\['Source PDF URL']; }).forEach(function(s){

&#x20;     attachedDocs.push({ type:'pdf', label:'Oil Sample Report – '+toIso\_(toDateOrNull\_(s\['Sampled Date'])).slice(0,10)+'.pdf', url:s\['Source PDF URL'] });

&#x20;   });



&#x20;   Logger.log('api\_getLpTimeline\_: ' + (Date.now()-t0) + 'ms — ' + total + ' events, page ' + page);



&#x20;   return {

&#x20;     lpContext: {

&#x20;       lpId: primaryLp.lpIdCode, lpDesc: primaryLp.pointDescription,

&#x20;       equipmentId: primaryLp.equipmentIdCode, equipmentName: primaryLp.assetName,

&#x20;       area: primaryLp.areaName, contractor: primaryLp.contractor,

&#x20;       oilType: primaryLp.lubricantType,

&#x20;       oilGrade: equipInfo\['ISO Grade'] || null,

&#x20;       capacityL: primaryLp.standardQuantityL,

&#x20;       frequency: primaryLp.frequencyLabel, frequencyType: primaryLp.frequencyType,

&#x20;       status: lubStatus.bucket, lastChangeDate: lastChangeDate,

&#x20;       nextDue: toIso\_(lubStatus.nextDue), daysRemaining: daysRemaining

&#x20;     },

&#x20;     kpis: {

&#x20;       oilChanges: allHistory.length,

&#x20;       oilSamples: allSamples.length,

&#x20;       actions: allActions.length,

&#x20;       openActions: openActionCount,

&#x20;       overdueEvents: overdueCount,

&#x20;       firstRecordDate: toIso\_(firstRecord),

&#x20;       routeCompletions: routeCompletions

&#x20;     },

&#x20;     dateRange: { from: fromDate.toISOString().slice(0,10), to: toDate.toISOString().slice(0,10) },

&#x20;     upcoming: upcoming,

&#x20;     attachedDocs: attachedDocs,

&#x20;     events: paged,

&#x20;     total: total,

&#x20;     page: page,

&#x20;     pageSize: pageSize,

&#x20;     hasMore: (page+1)\*pageSize < total

&#x20;   };



&#x20; } catch(err) {

&#x20;   Logger.log('api\_getLpTimeline\_ ERROR after ' + (Date.now()-t0) + 'ms: ' + (err \&\& err.message));

&#x20;   // Re-throw API errors as-is; wrap unexpected errors with a friendly message

&#x20;   if (err \&\& err.isApiError) throw err;

&#x20;   throw apiError\_(500, 'Timeline data could not be loaded. Please try again or narrow the date range.');

&#x20; }

}



