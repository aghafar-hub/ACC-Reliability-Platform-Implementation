/**
 * Generates ACC_OIL_ANALYSIS_DATABASE_V2_DRAFT.xlsx (design prototype only).
 * No external dependencies — writes OOXML and zips with Node + child_process.
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const OUT_DIR = path.resolve('docs/10_MODULES/OIL_ANALYSIS/workbook-v2-design');
const OUT_XLSX = path.join(OUT_DIR, 'ACC_OIL_ANALYSIS_DATABASE_V2_DRAFT.xlsx');
const TMP = path.resolve('.tmp-v2-xlsx-build');

// ─── OOXML helpers ───────────────────────────────────────────────────────────
class Ss {
  constructor() {
    this.items = [];
    this.map = new Map();
  }
  add(s) {
    const k = String(s);
    if (this.map.has(k)) return this.map.get(k);
    const i = this.items.length;
    this.items.push(k);
    this.map.set(k, i);
    return i;
  }
  xml() {
    const parts = this.items.map((t) => {
      const esc = t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<si><t xml:space="preserve">${esc}</t></si>`;
    });
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${this.items.length}" uniqueCount="${this.items.length}">${parts.join('')}</sst>`;
  }
}

function colLetter(n) {
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function escXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildSheetXml(rows, ss, merges = [], colWidths = {}) {
  const rowXml = [];
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const cells = [];
    for (let c = 0; c < row.length; c++) {
      const v = row[c];
      if (v === null || v === undefined || v === '') continue;
      const ref = `${colLetter(c + 1)}${r + 1}`;
      if (typeof v === 'number') {
        cells.push(`<c r="${ref}"><v>${v}</v></c>`);
      } else {
        const idx = ss.add(v);
        cells.push(`<c r="${ref}" t="s"><v>${idx}</v></c>`);
      }
    }
    if (cells.length) rowXml.push(`<row r="${r + 1}">${cells.join('')}</row>`);
  }
  const mergeXml = merges.length
    ? `<mergeCells count="${merges.length}">${merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>`
    : '';
  const colsXml = Object.entries(colWidths)
    .map(([col, w]) => `<col min="${col}" max="${col}" width="${w}" customWidth="1"/>`)
    .join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="5" topLeftCell="A6" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <cols>${colsXml}</cols>
  <sheetData>${rowXml.join('')}</sheetData>
  ${mergeXml}
</worksheet>`;
}

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="4">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="14"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><i/><sz val="10"/><color rgb="FF666666"/><name val="Calibri"/></font>
  </fonts>
  <fills count="6">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1F4E79"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF2E75B6"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE2EFDA"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border/><border><bottom style="thin"><color rgb="FF1F4E79"/></bottom></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="6">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="3" fillId="5" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
    <xf numFmtId="0" fontId="0" fillId="4" borderId="0" xfId="0" applyFill="1"/>
    <xf numFmtId="0" fontId="0" fillId="5" borderId="0" xfId="0" applyFill="1"/>
  </cellXfs>
</styleSheet>`;

// ─── Sheet definitions ─────────────────────────────────────────────────────────
const ss = new Ss();
const sheets = [];

function addSheet(name, rows, hidden = false, merges = []) {
  const widths = {};
  for (let c = 1; c <= 20; c++) widths[c] = 14;
  sheets.push({ name, hidden, xml: buildSheetXml(rows, ss, merges, widths) });
}

const RO = '🔒 READ ONLY — Platform mirror. Do not edit.';
const STG = '⚠ STAGING — Not production. Approve to Data_Entry only.';
const PRD = '✎ PRODUCTION — Manual entry permitted. Sole approved sample table.';

addSheet('README', [
  ['ACC OIL ANALYSIS DATABASE — WORKBOOK V2 (DESIGN DRAFT)'],
  ['Arabian Cement Company · Reliability Platform · Engineering Emergency Fallback'],
  [''],
  ['LEVEL', 'SHEET', 'PURPOSE', 'EDIT?'],
  ['L1 Staging', 'OCR_Import_Queue', 'Raw OCR/PDF extract queue (hidden)', 'System'],
  ['L1 Staging', 'OCR_Review', 'Engineer review before production', 'Engineer'],
  ['L2 Production', 'Data_Entry', 'Approved oil sample records ONLY', 'Engineer'],
  ['L2 Reference', 'Equipment_Registry', 'Equipment master (Equipment_ID)', 'Reference'],
  ['L2 Reference', 'LP_Register', 'Lubrication points (LP_ID)', 'Reference'],
  ['L2 Viewer', 'Action_Tracker', 'Engineering Actions (Source=Oil Analysis)', RO],
  ['L2 Viewer', 'Oil_Change_Log', 'Condition-based oil changes (Oil Lube module)', RO],
  ['L3 Analytics', 'Dashboard', 'KPIs and fleet health summary', 'Never'],
  ['L3 Analytics', 'Oil_Sample_Tracker', 'Monthly LP sampling matrix', 'Never'],
  ['L3 Analytics', 'Oil_Sample_Timeline', 'Interval compliance view', 'Never'],
  ['L3 Analytics', 'Analysis_Reports', 'Per-sample engineering report view', 'Never'],
  ['System', 'LP_Mapping_Memory / PDF_Archive / Import_Audit_Log', 'Audit & integration support', 'System'],
  [''],
  ['DATA FLOW: PDF → OCR_Import_Queue → OCR_Review → [Approve] → Data_Entry → Trackers → Reports → Dashboard'],
  ['Emergency: If app/script/OCR/Drive unavailable — enter samples directly in Data_Entry.'],
]);

const dataEntryHeaders = [
  'Equipment_ID', 'LP_ID', 'Equipment_Description', 'Sample_ID', 'Sample_Date', 'Report_Status',
  'Contamination_Rating', 'Equipment_Rating', 'Lubricant_Rating', 'Particle_Count_>4um', 'Particle_Count_>6um',
  'Particle_Count_>14um', 'PQ_Index', 'Visc@40C_cSt', 'TAN_mgKOHg', 'Oxidation_Abcm', 'Water_VolPct',
  'Ag_ppm', 'Al_ppm', 'Cr_ppm', 'Cu_ppm', 'Fe_ppm', 'Mo_ppm', 'Ni_ppm', 'Pb_ppm', 'Sn_ppm', 'K_ppm',
  'Na_ppm', 'Si_ppm', 'B_ppm', 'Ba_ppm', 'Ca_ppm', 'Mg_ppm', 'P_ppm', 'Zn_ppm', 'Alert_Type',
  'Sample_Analysis', 'Lubricant_Grade', 'Contractor_ID', 'Import_Source', 'PDF_File_ID', 'PDF_URL',
  'Record_Status', 'OCR_Queue_ID', 'Approved_By', 'Approved_At', 'Created_By', 'Created_At', 'Last_Modified', 'Row_Version',
];

addSheet('Data_Entry', [
  ['🛢 OIL ANALYSIS — MASTER DATA ENTRY (V2)', '', '', '', PRD],
  ['All approved samples. OCR never writes here directly.'],
  [''],
  ['FILTER YEAR:', 'All Years', '', 'FILTER MONTH:', 'All Months'],
  dataEntryHeaders,
  [
    '111.AF040 (R)', 'LP-111-AF040-R', 'Clay apron feeder right gearbox', '26123350230', '2026-04-15', 'Caution',
    'Caution', 'Normal', 'Normal', 5, '', '', '', 200.7, 0.01, '', '', 0, 5, 1, 0, 32, 0, 0, 0, 0, 0, 29, 2, 0, 12, 0, 449, 8,
    'Caution – Elevated Fe & Si', 'Fe (32 ppm) and Si (29 ppm) elevated.', 'MOBIL SHC 630', 'RHI', 'manual', '', '',
    'Active', '', 'A. Engineer', '2026-04-16T10:00:00Z', 'A. Engineer', '2026-04-16T10:00:00Z', '2026-04-16T10:00:00Z', 1,
  ],
  [
    '531.LQ110', 'LP-531-LQ110-DE', 'Raw mill motor drive end', '26124405238', '2026-04-20', 'Alert',
    'Alert', 'Normal', 'Alert', 50, '', '', 48, 269.9, 0.2, '', 0.2, 0, 2, 0, 0, 66, 0, 0, 0, 0, 0, 11, 26, 0, 49, 2, 701, 39,
    'Excessive Water / Elevated Viscosity', 'ACTION REQUIRED — drain and refill.', 'MOBIL SHC 629', 'ASEC', 'ocr-approved', '1AbC_driveFileId', 'https://drive.google.com/file/d/1AbC/view',
    'Active', 'OCR-2026-0042', 'B. Reliability', '2026-04-21T08:30:00Z', 'OCR Pipeline', '2026-04-21T08:00:00Z', '2026-04-21T08:30:00Z', 1,
  ],
]);

addSheet('Equipment_Registry', [
  ['EQUIPMENT REGISTRY — Equipment_ID master reference'],
  ['Equipment_ID', 'Description', 'Asset_ID', 'Asset_Class', 'Lubricant_Grade', 'Sampling_Interval', 'Manufacturer', 'Model', 'Area', 'Contractor_ID', 'Criticality', 'Active'],
  ['111.AF040 (L)', 'Clay apron feeder left geared motor', '30921624', 'Gear Drive', 'MOBIL SHC 630', '6 Months', 'BREVINI', 'SL2PLB08516', 'Kiln', 'RHI', 'High', 'Yes'],
  ['111.AF040 (R)', 'Clay apron feeder right gearbox', '30921623', 'Gear Drive', 'MOBIL SHC 630', '6 Months', 'BREVINI', 'SL2PLB08516', 'Kiln', 'RHI', 'High', 'Yes'],
  ['531.LQ110', 'Raw mill lubrication pump', '40123456', 'Circulating System', 'MOBIL SHC 629', '3 Months', 'Reliance', 'N/A', 'Raw Mill', 'ASEC', 'Critical', 'Yes'],
]);

addSheet('LP_Register', [
  ['LP REGISTER — Lubrication / sampling points (read-only reference)'],
  ['LP_ID', 'Equipment_ID', 'LP_Name', 'Position', 'Lubricant_Spec', 'OA_Required', 'OA_Interval_Days', 'Contractor_ID', 'Active'],
  ['LP-111-AF040-L', '111.AF040 (L)', 'Left geared motor', 'Drive End', 'MOBIL SHC 630', 'Yes', 180, 'RHI', 'Yes'],
  ['LP-111-AF040-R', '111.AF040 (R)', 'Right gearbox', 'Gearbox', 'MOBIL SHC 630', 'Yes', 180, 'RHI', 'Yes'],
  ['LP-531-LQ110-DE', '531.LQ110', 'Pump bearing DE', 'Drive End', 'MOBIL SHC 629', 'Yes', 90, 'ASEC', 'Yes'],
]);

addSheet('OCR_Review', [
  ['OCR REVIEW — Engineer approval gate', '', '', STG],
  ['Queue_ID', 'PDF_File_Name', 'Equipment_ID_Suggested', 'LP_ID_Confirmed', 'Sample_ID', 'Sample_Date', 'Report_Status', 'OCR_Confidence', 'Review_Status', 'Reviewer', 'Reviewed_At', 'Notes'],
  ['OCR-2026-0042', 'Alert 531.LQ110 Sample Report.pdf', '531.LQ110', 'LP-531-LQ110-DE', '26124405238', '2026-04-20', 'Alert', 0.94, 'Approved', 'B. Reliability', '2026-04-21T08:30:00Z', 'Mapped via LP memory'],
  ['OCR-2026-0043', 'Caution 532.MD302 Sample Report.pdf', '532.MD302', '', '26125001111', '2026-04-22', 'Caution', 0.88, 'Pending LP Mapping', '', '', 'Awaiting LP selection'],
]);

addSheet('Action_Tracker', [
  ['ACTION TRACKER — Oil Analysis viewer', '', RO],
  ['Mirrors Platform Engineering Actions where Source = Oil Analysis. Not the master database.'],
  [''],
  ['Action_No', 'Equipment_ID', 'LP_ID', 'Equipment_Name', 'Sample_ID', 'Priority', 'Status', 'Contractor', 'Assigned_To', 'Due_Date', 'Sample_Date', 'Sample_Result', 'Sample_Analysis', 'ACC_Action', 'Contractor_Action', 'Agreed_Action', 'Completed_Date', 'Last_Synced'],
  ['EA-2026-0142', '131.BC500 (M01)', 'LP-131-BC500-M01', 'Belt Conveyor Gearbox', '26080820000', 'High', 'Open', 'RHI', 'Maint. Lead', '2026-05-01', '2026-04-10', 'Alert', 'Heavily contaminated — elevated viscosity', 'Change oil', 'Oil change at next PM', 'Change oil', '', '2026-04-21T12:00:00Z'],
]);

addSheet('Oil_Change_Log', [
  ['OIL CHANGE LOG — Condition-based history viewer', '', RO],
  ['Source: Oil Lubrication Module. Workbook does not own oil changes.'],
  [''],
  ['Equipment_ID', 'LP_ID', 'Equipment_Name', 'LP_Name', 'Frequency_Type', 'Oil_Type', 'Brand', 'Qty_L', 'Last_Change_Date', 'Next_Due_Date', 'Status', 'Change_Reason', 'Last_Synced'],
  ['111.AF040 (L)', 'LP-111-AF040-L', 'Apron Feeder', 'Left geared motor', 'Oil Analysis', 'MOBIL SHC 630', 'Mobil', 41, '2021-06-15', '2024-06-15', 'Overdue', 'Condition-based', '2026-04-21T12:00:00Z'],
  ['111.BC210', 'LP-111-BC210-GB', 'Belt Conveyor', 'Gearbox Rossi', 'Oil Analysis', 'MOBIL SHC 632', 'Mobil', 100, '2026-03-20', '2027-03-20', 'OK', 'Scheduled', '2026-04-21T12:00:00Z'],
]);

addSheet('Dashboard', [
  ['📊 OIL ANALYSIS — EQUIPMENT DIAGNOSTIC DASHBOARD'],
  ['Select Equipment_ID — KPIs update from Data_Entry (formula-driven in production workbook)'],
  [''],
  ['SELECT EQUIPMENT_ID:', '531.LQ110'],
  [''],
  ['KPI', 'VALUE', 'NOTES'],
  ['Latest Report Status', 'Alert', 'From latest Sample_Date per LP'],
  ['Open Actions (OA)', 3, 'From Action_Tracker viewer'],
  ['Overdue Oil Changes', 12, 'From Oil_Change_Log viewer'],
  ['Samples YTD', 48, 'Count from Data_Entry'],
  ['Critical LPs', 5, 'Alert status on latest sample'],
]);

addSheet('Oil_Sample_Tracker', [
  ['OIL SAMPLE TRACKER — Monthly matrix (LP_ID rows)', '', '🔒 Analytics — formula from Data_Entry'],
  ['LP_ID', 'Equipment_ID', 'Last_Sample', 'Interval_Days', 'Apr 2026', 'Mar 2026', 'Feb 2026', 'Jan 2026'],
  ['LP-111-AF040-R', '111.AF040 (R)', '2026-04-15', 180, 'Caution|15 Apr 2026', 'Alert|10 Jan 2026', 'MISSING', 'Normal|20 Oct 2025'],
  ['LP-531-LQ110-DE', '531.LQ110', '2026-04-20', 90, 'Alert|20 Apr 2026', 'Normal|18 Jan 2026', 'Normal|20 Oct 2025', 'Caution|22 Jul 2025'],
]);

addSheet('Oil_Sample_Timeline', [
  ['OIL SAMPLE TIMELINE — Sampling interval compliance', '', '🔒 Analytics'],
  ['LP_ID', 'Equipment_ID', 'Last_Sample', 'Next_Due', 'Days_Remaining', 'Compliance_Status'],
  ['LP-111-AF040-R', '111.AF040 (R)', '2026-04-15', '2026-10-12', 174, 'On Track'],
  ['LP-531-LQ110-DE', '531.LQ110', '2026-04-20', '2026-07-19', 89, 'On Track'],
]);

addSheet('Analysis_Reports', [
  ['ANALYSIS REPORTS — Per-sample engineering view', '', '🔒 Analytics — driven by Data_Entry selection'],
  ['Sample_ID', 'Equipment_ID', 'LP_ID', 'Sample_Date', 'Report_Status', 'Key Finding', 'Recommendation'],
  ['26124405238', '531.LQ110', 'LP-531-LQ110-DE', '2026-04-20', 'Alert', 'Water 0.2%, Visc 269.9 cSt', 'Drain, inspect seals, contact lab rep'],
]);

// Hidden system sheets
addSheet('OCR_Import_Queue', [
  ['OCR IMPORT QUEUE — Raw staging (hidden)'],
  ['Queue_ID', 'Received_At', 'PDF_File_Name', 'Drive_File_ID', 'Drive_URL', 'Report_Pattern', 'Page_Count', 'OCR_Status', 'Extract_JSON_Ref', 'Duplicate_Sample_ID', 'Import_Batch_ID'],
  ['OCR-2026-0042', '2026-04-21T07:55:00Z', 'Alert 531.LQ110 Sample Report.pdf', '1AbC_driveFileId', 'https://drive.google.com/...', 'mobil-alert-v3', 2, 'Extracted', 'blob-ref-0042', '', 'BATCH-2026-041'],
], true);

addSheet('LP_Mapping_Memory', [
  ['LP MAPPING MEMORY — Engineer-confirmed Equipment_ID → LP_ID'],
  ['Equipment_ID', 'LP_ID', 'Report_Pattern', 'Learned_At', 'Use_Count', 'Last_Used_At', 'Learned_By'],
  ['531.LQ110', 'LP-531-LQ110-DE', 'mobil-alert-v3', '2026-03-01T09:00:00Z', 12, '2026-04-21T08:30:00Z', 'B. Reliability'],
], true);

addSheet('PDF_Archive', [
  ['PDF ARCHIVE — Metadata only (hidden)'],
  ['Archive_ID', 'Sample_ID', 'Queue_ID', 'Drive_File_ID', 'Drive_URL', 'File_Name', 'File_Size_KB', 'SHA256', 'Uploaded_At', 'Uploaded_By'],
  ['PDF-00042', '26124405238', 'OCR-2026-0042', '1AbC_driveFileId', 'https://drive.google.com/...', 'Alert 531.LQ110 Sample Report.pdf', 412, 'abc123...', '2026-04-21T07:55:00Z', 'OCR Pipeline'],
], true);

addSheet('Import_Audit_Log', [
  ['IMPORT AUDIT LOG — Append-only (hidden)'],
  ['Audit_ID', 'Event_Timestamp', 'Event_Type', 'Queue_ID', 'Sample_ID', 'Equipment_ID', 'LP_ID', 'Actor', 'Details', 'Prior_Row_Version'],
  ['AUD-00001', '2026-04-21T07:55:00Z', 'Uploaded', 'OCR-2026-0042', '', '531.LQ110', '', 'System', 'PDF received', ''],
  ['AUD-00002', '2026-04-21T08:30:00Z', 'Approved', 'OCR-2026-0042', '26124405238', '531.LQ110', 'LP-531-LQ110-DE', 'B. Reliability', 'Promoted to Data_Entry row 7', ''],
], true);

addSheet('_Config_Validation', [
  ['VALIDATION LISTS — Do not edit without engineering approval'],
  ['Report_Status', 'Normal', 'Caution', 'Alert'],
  ['Import_Source', 'manual', 'ocr-approved', 'platform-sync'],
  ['Record_Status', 'Active', 'Cancelled'],
  ['Review_Status', 'Pending', 'Pending LP Mapping', 'Approved', 'Rejected', 'Skipped'],
  ['Audit_Event_Type', 'Uploaded', 'Approved', 'Rejected', 'Skipped', 'Overwritten'],
], true);

addSheet('_Sync_Metadata', [
  ['SYNC METADATA — Platform integration timestamps'],
  ['Entity', 'Last_Sync_At', 'Sync_Direction', 'Records', 'Notes'],
  ['Action_Tracker', '2026-04-21T12:00:00Z', 'Platform → Workbook', 142, 'Source=Oil Analysis'],
  ['Oil_Change_Log', '2026-04-21T12:00:00Z', 'Oil Lube → Workbook', 153, 'Read-only mirror'],
  ['LP_Register', '2026-04-21T06:00:00Z', 'Platform → Workbook', 287, 'Reference only'],
], true);

// ─── Package XLSX ─────────────────────────────────────────────────────────────
function writePackage() {
  if (fs.existsSync(TMP)) fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(path.join(TMP, '_rels'), { recursive: true });
  fs.mkdirSync(path.join(TMP, 'docProps'), { recursive: true });
  fs.mkdirSync(path.join(TMP, 'xl', '_rels'), { recursive: true });
  fs.mkdirSync(path.join(TMP, 'xl', 'worksheets'), { recursive: true });

  fs.writeFileSync(path.join(TMP, '[Content_Types].xml'), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  ${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}
</Types>`);

  fs.writeFileSync(path.join(TMP, '_rels', '.rels'), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`);

  fs.writeFileSync(path.join(TMP, 'docProps', 'core.xml'), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>ACC Oil Analysis Database V2 Draft</dc:title>
  <dc:creator>ACC Reliability Platform Engineering</dc:creator>
  <dcterms:created xsi:type="dcterms:W3CDTF">2026-07-05T00:00:00Z</dcterms:created>
  <dc:description>Design prototype — not for production use</dc:description>
</cp:coreProperties>`);

  fs.writeFileSync(path.join(TMP, 'docProps', 'app.xml'), `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>ACC Workbook V2 Generator</Application>
</Properties>`);

  fs.writeFileSync(path.join(TMP, 'xl', 'sharedStrings.xml'), ss.xml());
  fs.writeFileSync(path.join(TMP, 'xl', 'styles.xml'), stylesXml);

  sheets.forEach((s, i) => {
    fs.writeFileSync(path.join(TMP, 'xl', 'worksheets', `sheet${i + 1}.xml`), s.xml);
  });

  const sheetRels = sheets
    .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
    .join('');
  const styleRelId = `rId${sheets.length + 1}`;
  const ssRelId = `rId${sheets.length + 2}`;

  fs.writeFileSync(
    path.join(TMP, 'xl', '_rels', 'workbook.xml.rels'),
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheetRels}
  <Relationship Id="${styleRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="${ssRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`,
  );

  const sheetTags = sheets
    .map((s, i) => `<sheet name="${escXml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"${s.hidden ? ' state="hidden"' : ''}/>`)
    .join('');
  fs.writeFileSync(
    path.join(TMP, 'xl', 'workbook.xml'),
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheetTags}</sheets>
</workbook>`,
  );

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const zipPath = OUT_XLSX.replace('.xlsx', '.zip');
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  if (fs.existsSync(OUT_XLSX)) fs.unlinkSync(OUT_XLSX);

  // PowerShell Compress-Archive
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${TMP}\\*' -DestinationPath '${zipPath}' -Force"`,
    { stdio: 'inherit' },
  );
  fs.copyFileSync(zipPath, OUT_XLSX);
  fs.unlinkSync(zipPath);
  console.log('Wrote', OUT_XLSX);
}

writePackage();
