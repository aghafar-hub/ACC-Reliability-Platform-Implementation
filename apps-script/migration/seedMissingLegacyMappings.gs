/**
 * ACC Reliability Platform — Seed Missing Legacy Mappings
 * File:   apps-script/migration/seedMissingLegacyMappings.gs
 * Sprint: 08 — Phase 1: Complete Legacy Mapping Dictionary
 *
 * PURPOSE
 *   Appends missing rows to master dictionary sheets (Areas, Oil_Types, Oil_Brands)
 *   and to all 7 Legacy_*_Mapping sheets so that previewMasterDataMigration()
 *   reaches V-MAP-001 = 0.
 *
 * DATA SOURCE (reference xlsx, Jul 2026):
 *   ACC_Oil_Users_Config  : 61 areas (numeric codes), 22 lubricant types
 *   ACC_Oil_Operational   : 20 oil-type names in LP sheet
 *   Equipment Register    : 20 descriptive areas (Kiln1, RawMill1, etc.)
 *
 * SAFETY RULES
 *   - Reads existing rows before inserting — never duplicates
 *   - Never deletes or overwrites existing rows
 *   - Only appends to MASTER_DATA workbook mapping/dictionary sheets
 *   - Does NOT touch Equipment_Master, LP_Master, or any operational workbook
 *
 * RUN ORDER
 *   1. seedMissingLegacyMappings()   ← this function
 *   2. previewMasterDataMigration()  ← verify V-MAP-001 = 0
 */

// ─── ENTRY POINT ─────────────────────────────────────────────────────────────

/**
 * Main entry point. Appends all missing master dict rows and mapping rows.
 * @returns {{ masterAdded: Object, mappingResults: Object[] }}
 */
function seedMissingLegacyMappings() {
  logWorkbookGuard_('seedMissingLegacyMappings', 'MASTER_DATA');

  var masterDataId = getResolvedWorkbookId_('MASTER_DATA');
  var ss = SpreadsheetApp.openById(masterDataId);
  var ts = smlTs_();

  smlLog_('=== seedMissingLegacyMappings START (Sprint 08 Phase 1) ===');

  // ── Step 1: Ensure required master dictionary rows exist ─────────────────
  smlLog_('--- Step 1: Master dictionary rows ---');
  var masterReport = {
    areasAdded:         smlEnsureAreaRows_(ss, ts),
    oilTypesAdded:      smlEnsureOilTypeRows_(ss, ts),
    oilBrandsAdded:     smlEnsureOilBrandRows_(ss, ts),
    equipmentTypesAdded: smlEnsureEquipmentTypeRows_(ss, ts),
  };

  smlLog_('Master dict — Areas: '        + masterReport.areasAdded
        + '  OilTypes: '    + masterReport.oilTypesAdded
        + '  OilBrands: '   + masterReport.oilBrandsAdded
        + '  EqTypes: '     + masterReport.equipmentTypesAdded);

  // ── Step 2: Seed all 7 Legacy_*_Mapping sheets ───────────────────────────
  smlLog_('--- Step 2: Legacy mapping sheets ---');
  var mappingResults = [
    smlSeedAreaMappings_(ss, ts),
    smlSeedOilTypeMappings_(ss, ts),
    smlSeedOilBrandMappings_(ss, ts),
    smlSeedEquipmentTypeMappings_(ss, ts),
    smlSeedContractorMappings_(ss, ts),
    smlSeedStatusMappings_(ss, ts),
    smlSeedLineMappings_(ss, ts),
  ];

  smlLog_('=== seedMissingLegacyMappings COMPLETE ===');
  for (var i = 0; i < mappingResults.length; i++) {
    smlLog_('  [' + mappingResults[i].sheet + '] added=' + mappingResults[i].added + ' rows');
  }

  return { masterAdded: masterReport, mappingResults: mappingResults };
}

// ─── MASTER DICTIONARY: AREAS ─────────────────────────────────────────────────

/**
 * Adds missing rows to the Areas sheet.
 * Checks by area_id (col A) — skips if ID already present.
 * @returns {number} rows added
 */
function smlEnsureAreaRows_(ss, ts) {
  var sheet = ss.getSheetByName('Areas');
  if (!sheet) {
    smlLog_('WARN: Areas sheet not found — skipping area master rows');
    return 0;
  }

  var existingIds = smlReadColumnSet_(sheet, 1); // column A = area_id
  var newRows = smlNewAreaMasterRows_(ts);
  var toAdd = [];
  for (var i = 0; i < newRows.length; i++) {
    var areaId = String(newRows[i][0]).toUpperCase();
    if (!existingIds[areaId]) {
      toAdd.push(newRows[i]);
    }
  }

  if (toAdd.length > 0) {
    smlAppendRows_(sheet, toAdd);
    smlLog_('Areas: appended ' + toAdd.length + ' rows');
  }
  return toAdd.length;
}

/**
 * Returns all new platform Area rows required by migration.
 * 9 columns: area_id, area_code, area_name, main_area, line,
 *            responsible_contractor_id, status, created_at, updated_at
 *
 * Source: ACC_Oil_Users_Config Areas sheet (61 numeric areas)
 *         + Equipment Register (20 descriptive areas)
 * Existing platform: AREA-001(111/RHI), AREA-002(312/RHI), AREA-003(ASEC-01/ASEC)
 */
function smlNewAreaMasterRows_(ts) {
  // format: [area_id, area_code, area_name, main_area, line, contractor_id, status, created_at, updated_at]
  // CTR-001 = RHI  |  CTR-002 = ASEC
  var RHI  = 'CTR-001';
  var ASEC = 'CTR-002';
  var ACT  = 'ACTIVE';
  var L1   = 'Line1';
  var L2   = 'Line2';

  return [
    // ── Numeric areas from ACC_Oil_Users_Config / Areas sheet ────────────────
    // RHI areas (codes 123–472, excl. 111 and 312 which already exist)
    ['AREA-004', '123', 'Raw Additives L1',    'Raw Material', L1, RHI,  ACT, ts, ts],
    ['AREA-005', '124', 'Raw Additives L2',    'Raw Material', L1, RHI,  ACT, ts, ts],
    ['AREA-006', '131', 'Raw Stacking Area',   'Raw Material', L1, RHI,  ACT, ts, ts],
    ['AREA-007', '241', 'Area 241',            'Process',      L1, RHI,  ACT, ts, ts],
    ['AREA-008', '242', 'Area 242',            'Process',      L1, RHI,  ACT, ts, ts],
    ['AREA-009', '261', 'Area 261',            'Process',      L1, RHI,  ACT, ts, ts],
    ['AREA-010', '262', 'Area 262',            'Process',      L1, RHI,  ACT, ts, ts],
    ['AREA-011', '263', 'Area 263',            'Process',      L1, RHI,  ACT, ts, ts],
    ['AREA-012', '311', 'Area 311',            'Process',      L1, RHI,  ACT, ts, ts],
    ['AREA-013', '321', 'Area 321',            'Process',      L1, RHI,  ACT, ts, ts],
    ['AREA-014', '322', 'Area 322',            'Process',      L1, RHI,  ACT, ts, ts],
    ['AREA-015', '331', 'Area 331',            'Process',      L1, RHI,  ACT, ts, ts],
    ['AREA-016', '332', 'Area 332',            'Process',      L1, RHI,  ACT, ts, ts],
    ['AREA-017', '341', 'Area 341',            'Process',      L1, RHI,  ACT, ts, ts],
    ['AREA-018', '342', 'Area 342',            'Process',      L1, RHI,  ACT, ts, ts],
    ['AREA-019', '351', 'Area 351',            'Process',      L1, RHI,  ACT, ts, ts],
    ['AREA-020', '352', 'Area 352',            'Process',      L1, RHI,  ACT, ts, ts],
    ['AREA-021', '421', 'Area 421',            'Process',      L1, RHI,  ACT, ts, ts],
    ['AREA-022', '422', 'Area 422',            'Process',      L1, RHI,  ACT, ts, ts],
    ['AREA-023', '431', 'Area 431',            'Process',      L1, RHI,  ACT, ts, ts],
    ['AREA-024', '432', 'Area 432',            'Process',      L1, RHI,  ACT, ts, ts],
    ['AREA-025', '441', 'Area 441',            'Process',      L1, RHI,  ACT, ts, ts],
    ['AREA-026', '442', 'Area 442',            'Process',      L1, RHI,  ACT, ts, ts],
    ['AREA-027', '451', 'Area 451',            'Process',      L1, RHI,  ACT, ts, ts],
    ['AREA-028', '452', 'Area 452',            'Process',      L1, RHI,  ACT, ts, ts],
    ['AREA-029', '461', 'Area 461',            'Process',      L1, RHI,  ACT, ts, ts],
    ['AREA-030', '462', 'Area 462',            'Process',      L1, RHI,  ACT, ts, ts],
    ['AREA-031', '465', 'Area 465',            'Process',      L1, RHI,  ACT, ts, ts],
    ['AREA-032', '466', 'Area 466',            'Process',      L1, RHI,  ACT, ts, ts],
    ['AREA-033', '471', 'Area 471',            'Process',      L1, RHI,  ACT, ts, ts],
    ['AREA-034', '472', 'Area 472',            'Process',      L1, RHI,  ACT, ts, ts],
    // ASEC numeric areas (213, 222 = Gypsum; 481–646)
    ['AREA-035', '213', 'Gypsum Crusher Area', 'Gypsum',       L2, ASEC, ACT, ts, ts],
    ['AREA-036', '222', 'Gypsum Transport',    'Gypsum',       L2, ASEC, ACT, ts, ts],
    ['AREA-037', '481', 'Area 481',            'ASEC Process', L2, ASEC, ACT, ts, ts],
    ['AREA-038', '482', 'Area 482',            'ASEC Process', L2, ASEC, ACT, ts, ts],
    ['AREA-039', '511', 'Area 511',            'ASEC Process', L2, ASEC, ACT, ts, ts],
    ['AREA-040', '512', 'Area 512',            'ASEC Process', L2, ASEC, ACT, ts, ts],
    ['AREA-041', '513', 'Area 513',            'ASEC Process', L2, ASEC, ACT, ts, ts],
    ['AREA-042', '514', 'Area 514',            'ASEC Process', L2, ASEC, ACT, ts, ts],
    ['AREA-043', '531', 'Area 531',            'ASEC Process', L2, ASEC, ACT, ts, ts],
    ['AREA-044', '532', 'Area 532',            'ASEC Process', L2, ASEC, ACT, ts, ts],
    ['AREA-045', '533', 'Area 533',            'ASEC Process', L2, ASEC, ACT, ts, ts],
    ['AREA-046', '534', 'Area 534',            'ASEC Process', L2, ASEC, ACT, ts, ts],
    ['AREA-047', '541', 'Area 541',            'ASEC Process', L2, ASEC, ACT, ts, ts],
    ['AREA-048', '542', 'Area 542',            'ASEC Process', L2, ASEC, ACT, ts, ts],
    ['AREA-049', '543', 'Area 543',            'ASEC Process', L2, ASEC, ACT, ts, ts],
    ['AREA-050', '544', 'Area 544',            'ASEC Process', L2, ASEC, ACT, ts, ts],
    ['AREA-051', '611', 'Area 611',            'ASEC Process', L2, ASEC, ACT, ts, ts],
    ['AREA-052', '612', 'Area 612',            'ASEC Process', L2, ASEC, ACT, ts, ts],
    ['AREA-053', '613', 'Area 613',            'ASEC Process', L2, ASEC, ACT, ts, ts],
    ['AREA-054', '614', 'Area 614',            'ASEC Process', L2, ASEC, ACT, ts, ts],
    ['AREA-055', '621', 'Area 621',            'ASEC Process', L2, ASEC, ACT, ts, ts],
    ['AREA-056', '622', 'Area 622',            'ASEC Process', L2, ASEC, ACT, ts, ts],
    ['AREA-057', '641', 'Area 641',            'ASEC Process', L2, ASEC, ACT, ts, ts],
    ['AREA-058', '642', 'Area 642',            'ASEC Process', L2, ASEC, ACT, ts, ts],
    ['AREA-059', '643', 'Area 643',            'ASEC Process', L2, ASEC, ACT, ts, ts],
    ['AREA-060', '644', 'Area 644',            'ASEC Process', L2, ASEC, ACT, ts, ts],
    ['AREA-061', '645', 'Area 645',            'ASEC Process', L2, ASEC, ACT, ts, ts],
    ['AREA-062', '646', 'Area 646',            'ASEC Process', L2, ASEC, ACT, ts, ts],
    // ── Equipment Register descriptive areas (Kiln1, RawMill1, …) ────────────
    // Line assignment confirmed from Equipment Register source data (Jul 2026).
    // Contractor follows Line1 = RHI, Line2 = ASEC convention.
    ['AREA-063', 'Kiln1',        'Kiln Line 1',               'Kiln',         L1, RHI,  ACT, ts, ts],
    ['AREA-064', 'Kiln2',        'Kiln Line 2',               'Kiln',         L2, ASEC, ACT, ts, ts],
    ['AREA-065', 'RawMill1',     'Raw Mill 1',                'Raw Mill',     L1, RHI,  ACT, ts, ts],
    ['AREA-066', 'RawMill2',     'Raw Mill 2',                'Raw Mill',     L2, ASEC, ACT, ts, ts],
    ['AREA-067', 'CementMill1',  'Cement Mill 1',             'Cement Mill',  L1, RHI,  ACT, ts, ts],
    ['AREA-068', 'CementMill2',  'Cement Mill 2',             'Cement Mill',  L1, RHI,  ACT, ts, ts],
    ['AREA-069', 'CementMill3',  'Cement Mill 3',             'Cement Mill',  L2, ASEC, ACT, ts, ts],
    ['AREA-070', 'CementMill4',  'Cement Mill 4',             'Cement Mill',  L2, ASEC, ACT, ts, ts],
    ['AREA-071', 'CoalMill1',    'Coal Mill 1',               'Coal Mill',    L1, RHI,  ACT, ts, ts],
    ['AREA-072', 'CoalMill2',    'Coal Mill 2',               'Coal Mill',    L2, ASEC, ACT, ts, ts],
    ['AREA-073', 'ClinkerArea1', 'Clinker Area 1',            'Clinker',      L1, RHI,  ACT, ts, ts],
    ['AREA-074', 'ClinkerArea2', 'Clinker Area 2',            'Clinker',      L2, ASEC, ACT, ts, ts],
    ['AREA-075', 'GyCrusher',    'Gypsum Crusher',            'Gypsum',       L2, ASEC, ACT, ts, ts],
    ['AREA-076', 'RMCrusher',    'Raw Material Crusher',      'Raw Material', L1, RHI,  ACT, ts, ts],
    ['AREA-077', 'HotDisc',      'Hot Disc Area',             'Utilities',    L1, RHI,  ACT, ts, ts],
    ['AREA-078', 'Hydrogen',     'Hydrogen Station',          'Utilities',    L1, RHI,  ACT, ts, ts],
    ['AREA-079', 'PackingArea1', 'Packing Area 1',            'Packing',      L1, RHI,  ACT, ts, ts],
    ['AREA-080', 'PackingArea2', 'Packing Area 2',            'Packing',      L2, ASEC, ACT, ts, ts],
    ['AREA-081', 'AFR',          'Alternative Fuels Area',    'Utilities',    L2, ASEC, ACT, ts, ts],
    ['AREA-082', 'AFShredding',  'Alternative Fuels Shredding','Utilities',   L2, ASEC, ACT, ts, ts],
  ];
}

// ─── MASTER DICTIONARY: OIL TYPES ────────────────────────────────────────────

/**
 * Adds missing Oil_Types rows.
 * Checks by oil_type_id (col A) — skips if ID already present.
 * @returns {number} rows added
 */
function smlEnsureOilTypeRows_(ss, ts) {
  var sheet = ss.getSheetByName('Oil_Types');
  if (!sheet) {
    smlLog_('WARN: Oil_Types sheet not found');
    return 0;
  }

  var existingIds = smlReadColumnSet_(sheet, 1);
  var newRows = smlNewOilTypeMasterRows_(ts);
  var toAdd = [];
  for (var i = 0; i < newRows.length; i++) {
    var id = String(newRows[i][0]).toUpperCase();
    if (!existingIds[id]) {
      toAdd.push(newRows[i]);
    }
  }

  if (toAdd.length > 0) {
    smlAppendRows_(sheet, toAdd);
    smlLog_('Oil_Types: appended ' + toAdd.length + ' rows');
  }
  return toAdd.length;
}

/**
 * New Oil_Types master rows.
 * 8 cols: oil_type_id, type_code, type_name, viscosity_grade,
 *         base_type, application_notes, is_active, created_at
 *
 * Source: Mobil product specs + RENOLIN B 46 + Total Azolla 46 + Co-op Special 1
 * Do not guess technical properties beyond confirmed viscosity grade.
 * Existing: OT-001(VG320), OT-002(VG46), OT-003(VG68), OT-004(VG100), OT-005(VG150)
 */
function smlNewOilTypeMasterRows_(ts) {
  return [
    ['OT-006', 'VG22',    'Hydraulic Oil ISO VG 22',         'VG22',    'MINERAL',   'Light hydraulic systems (Mobil DTE 22)',              'TRUE', ts],
    ['OT-007', 'VG32',    'Hydraulic Oil ISO VG 32',         'VG32',    'MINERAL',   'Hydraulic systems (Mobil DTE 24, Vacuoline 528)',     'TRUE', ts],
    ['OT-008', 'VG220',   'Gear Oil ISO VG 220',             'VG220',   'MINERAL',   'Gearboxes (Mobilgear 600 XP 220, Mobil gear 600 XP 220)', 'TRUE', ts],
    ['OT-009', 'VG460',   'Gear Oil ISO VG 460',             'VG460',   'MINERAL',   'Heavy gearboxes (Mobilgear 600 XP 460)',              'TRUE', ts],
    ['OT-010', 'VG680',   'Synthetic Gear Oil ISO VG 680',   'VG680',   'SYNTHETIC', 'Very heavy gears / polyglycol type (Mobil Glygoyle HE 680)', 'TRUE', ts],
    ['OT-011', 'VG1000',  'Gear Oil ISO VG 1000',            'VG1000',  'SYNTHETIC', 'Extremely high viscosity (Mobil SHC 639, Mobil gear 600 XP 1000)', 'TRUE', ts],
    ['OT-012', 'COOP-SP1','Co-op Special 1',                 'UNKNOWN', 'MINERAL',   'Co-op lubricant — viscosity grade requires engineering confirmation', 'TRUE', ts],
  ];
}

// ─── MASTER DICTIONARY: OIL BRANDS ───────────────────────────────────────────

/**
 * Adds missing Oil_Brands rows.
 * Checks by brand_id (col A) — skips if ID already present.
 * @returns {number} rows added
 */
function smlEnsureOilBrandRows_(ss, ts) {
  var sheet = ss.getSheetByName('Oil_Brands');
  if (!sheet) {
    smlLog_('WARN: Oil_Brands sheet not found');
    return 0;
  }

  var existingIds = smlReadColumnSet_(sheet, 1);
  var newRows = smlNewOilBrandMasterRows_(ts);
  var toAdd = [];
  for (var i = 0; i < newRows.length; i++) {
    var id = String(newRows[i][0]).toUpperCase();
    if (!existingIds[id]) {
      toAdd.push(newRows[i]);
    }
  }

  if (toAdd.length > 0) {
    smlAppendRows_(sheet, toAdd);
    smlLog_('Oil_Brands: appended ' + toAdd.length + ' rows');
  }
  return toAdd.length;
}

/**
 * New Oil_Brands master rows.
 * 6 cols: brand_id, brand_name, manufacturer, product_line, is_active, created_at
 * Existing: OB-001(Shell Omala S2 G 320), OB-002(Shell Tellus S2 MX 46),
 *           OB-003(Mobil SHC Gear 320), OB-004(Castrol Tribol 1100),
 *           OB-005(Total Nevastane SH 46)
 */
function smlNewOilBrandMasterRows_(ts) {
  return [
    ['OB-006', 'FUCHS RENOLIN B',     'FUCHS',   'RENOLIN',         'TRUE', ts],
    ['OB-007', 'Total Azolla / Carter', 'Total', 'Industrial',      'TRUE', ts],
    ['OB-008', 'Co-op Industrial',    'Co-op',   'Industrial',      'TRUE', ts],
    ['OB-009', 'Mobilgear 600 XP',    'Mobil',   'Mobilgear',       'TRUE', ts],
    ['OB-010', 'Mobil DTE',           'Mobil',   'DTE',             'TRUE', ts],
    ['OB-011', 'Mobil Glygoyle',      'Mobil',   'Glygoyle',        'TRUE', ts],
    ['OB-012', 'Mobil SHC Gear',      'Mobil',   'SHC',             'TRUE', ts],
    ['OB-013', 'Mobil Vacuoline',     'Mobil',   'Vacuoline',       'TRUE', ts],
    ['OB-014', 'Mobil Rarus',         'Mobil',   'Rarus',           'TRUE', ts],
  ];
}

// ─── MASTER DICTIONARY: EQUIPMENT TYPES ──────────────────────────────────────

/**
 * Adds missing Equipment_Types rows referenced by Legacy_Equipment_Type_Mapping.
 * Checks by type_id (col A) — skips if ID already present.
 * @returns {number} rows added
 */
function smlEnsureEquipmentTypeRows_(ss, ts) {
  var sheet = ss.getSheetByName('Equipment_Types');
  if (!sheet) {
    smlLog_('WARN: Equipment_Types sheet not found');
    return 0;
  }

  var existingIds = smlReadColumnSet_(sheet, 1);
  // 7 cols: type_id, type_code, type_name, description, default_criticality, is_active, created_at
  // Existing: ET-001(PUMP), ET-002(COMPRESSOR), ET-003(GEARBOX),
  //           ET-004(MOTOR), ET-005(FAN), ET-006(PUMP_SCREW)
  var newRows = [
    ['ET-007', 'CONVEYOR',    'Conveyor / Belt Conveyor',      'Material transport conveyor',          'B', 'TRUE', ts],
    ['ET-008', 'CRUSHER',     'Crusher / Mill',                'Impact, jaw, or ball mill crusher',    'A', 'TRUE', ts],
    ['ET-009', 'ELEVATOR',    'Bucket Elevator',               'Vertical bulk-material elevator',      'B', 'TRUE', ts],
    ['ET-010', 'FEEDER',      'Feeder / Air Lock',             'Dosing feeder or rotary air lock',     'B', 'TRUE', ts],
    ['ET-011', 'SEPARATOR',   'Separator / Classifier',        'Dynamic separator or magnetic unit',   'B', 'TRUE', ts],
    ['ET-012', 'BLOWER',      'Industrial Blower',             'Rotary or centrifugal blower',         'B', 'TRUE', ts],
    ['ET-013', 'FILTER',      'Industrial Filter',             'Bag filter or screw-filter unit',      'B', 'TRUE', ts],
    ['ET-014', 'STACKER',     'Stacker / Reclaimer',           'Bulk-material stacker or reclaimer',   'B', 'TRUE', ts],
    ['ET-015', 'KILN',        'Rotary Kiln',                   'Cement rotary kiln',                   'A', 'TRUE', ts],
    ['ET-016', 'COOLER',      'Cooler / Dryer',                'Clinker cooler or rotary dryer',       'B', 'TRUE', ts],
  ];

  var toAdd = [];
  for (var i = 0; i < newRows.length; i++) {
    var id = String(newRows[i][0]).toUpperCase();
    if (!existingIds[id]) {
      toAdd.push(newRows[i]);
    }
  }

  if (toAdd.length > 0) {
    smlAppendRows_(sheet, toAdd);
    smlLog_('Equipment_Types: appended ' + toAdd.length + ' rows');
  }
  return toAdd.length;
}

// ─── MAPPING SHEET SEEDERS ────────────────────────────────────────────────────

/**
 * Seeds Legacy_Area_Mapping sheet.
 * Covers all 61 numeric areas ("Area NNN" + "NNN") and 20 Equipment Register areas.
 * Checks legacy_value (col B, normalized) before inserting.
 * @returns {{ sheet: string, added: number }}
 */
function smlSeedAreaMappings_(ss, ts) {
  var sheetName = 'Legacy_Area_Mapping';
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    smlLog_('WARN: ' + sheetName + ' not found');
    return { sheet: sheetName, added: 0 };
  }

  var existingKeys = smlReadColumnSet_(sheet, 2, true); // col B, normalized
  var prefix = 'MAP-AREA';
  var nextId  = smlGetNextMappingId_(sheet, 1, prefix);
  var toAdd   = [];

  // Format: [mapping_id, legacy_value, legacy_workbook, legacy_sheet,
  //          new_area_id, new_area_code, new_area_name,
  //          responsible_contractor_id, status, notes, created_at, updated_at]

  function tryAdd(legacyVal, wb, sheetName2, areaId, areaCode, areaName, ctrId, notes) {
    var key = legacyVal.toUpperCase();
    if (!existingKeys[key]) {
      existingKeys[key] = true; // prevent duplicate within this batch
      var id = prefix + '-' + smlPad_(nextId++, 3);
      toAdd.push([id, legacyVal, wb || '', sheetName2 || '', areaId,
                  areaCode, areaName, ctrId || '', 'ACTIVE', notes || '', ts, ts]);
    }
  }

  // ── Numeric areas: "NNN" code and "Area NNN" name variant ────────────────
  // Source: ACC_Oil_Users_Config.Equipment uses "Area NNN" format.
  //         ACC_Oil_Users_Config.Areas uses bare numeric code.
  //         ACC_Oil_Operational.LP uses "Area NNN" format.
  // For each area, add both forms (generic mapping — blank workbook/sheet = any source).
  var RHI  = 'CTR-001';
  var ASEC = 'CTR-002';

  var numericAreas = [
    // [code, area_id, contractor, area_name]
    // Existing platform (111→AREA-001, 312→AREA-002) already have mappings;
    // add "Area NNN" variants for any that are missing.
    ['111',  'AREA-001', RHI,  'Crusher'],            // already has "111","Area 111"
    ['123',  'AREA-004', RHI,  'Raw Additives L1'],   // "Area 123" already mapped→AREA-002 (wrong); add numeric code only
    ['124',  'AREA-005', RHI,  'Raw Additives L2'],
    ['131',  'AREA-006', RHI,  'Raw Stacking Area'],
    ['213',  'AREA-035', ASEC, 'Gypsum Crusher Area'],
    ['222',  'AREA-036', ASEC, 'Gypsum Transport'],
    ['241',  'AREA-007', RHI,  'Area 241'],
    ['242',  'AREA-008', RHI,  'Area 242'],
    ['261',  'AREA-009', RHI,  'Area 261'],
    ['262',  'AREA-010', RHI,  'Area 262'],
    ['263',  'AREA-011', RHI,  'Area 263'],
    ['311',  'AREA-012', RHI,  'Area 311'],
    ['312',  'AREA-002', RHI,  'Area 312'],            // already has "312","Area 312"
    ['321',  'AREA-013', RHI,  'Area 321'],
    ['322',  'AREA-014', RHI,  'Area 322'],
    ['331',  'AREA-015', RHI,  'Area 331'],
    ['332',  'AREA-016', RHI,  'Area 332'],
    ['341',  'AREA-017', RHI,  'Area 341'],
    ['342',  'AREA-018', RHI,  'Area 342'],
    ['351',  'AREA-019', RHI,  'Area 351'],
    ['352',  'AREA-020', RHI,  'Area 352'],
    ['421',  'AREA-021', RHI,  'Area 421'],
    ['422',  'AREA-022', RHI,  'Area 422'],
    ['431',  'AREA-023', RHI,  'Area 431'],
    ['432',  'AREA-024', RHI,  'Area 432'],
    ['441',  'AREA-025', RHI,  'Area 441'],
    ['442',  'AREA-026', RHI,  'Area 442'],
    ['451',  'AREA-027', RHI,  'Area 451'],
    ['452',  'AREA-028', RHI,  'Area 452'],
    ['461',  'AREA-029', RHI,  'Area 461'],
    ['462',  'AREA-030', RHI,  'Area 462'],
    ['465',  'AREA-031', RHI,  'Area 465'],
    ['466',  'AREA-032', RHI,  'Area 466'],
    ['471',  'AREA-033', RHI,  'Area 471'],
    ['472',  'AREA-034', RHI,  'Area 472'],
    ['481',  'AREA-037', ASEC, 'Area 481'],
    ['482',  'AREA-038', ASEC, 'Area 482'],
    ['511',  'AREA-039', ASEC, 'Area 511'],
    ['512',  'AREA-040', ASEC, 'Area 512'],
    ['513',  'AREA-041', ASEC, 'Area 513'],
    ['514',  'AREA-042', ASEC, 'Area 514'],
    ['531',  'AREA-043', ASEC, 'Area 531'],
    ['532',  'AREA-044', ASEC, 'Area 532'],
    ['533',  'AREA-045', ASEC, 'Area 533'],
    ['534',  'AREA-046', ASEC, 'Area 534'],
    ['541',  'AREA-047', ASEC, 'Area 541'],
    ['542',  'AREA-048', ASEC, 'Area 542'],
    ['543',  'AREA-049', ASEC, 'Area 543'],
    ['544',  'AREA-050', ASEC, 'Area 544'],
    ['611',  'AREA-051', ASEC, 'Area 611'],
    ['612',  'AREA-052', ASEC, 'Area 612'],
    ['613',  'AREA-053', ASEC, 'Area 613'],
    ['614',  'AREA-054', ASEC, 'Area 614'],
    ['621',  'AREA-055', ASEC, 'Area 621'],
    ['622',  'AREA-056', ASEC, 'Area 622'],
    ['641',  'AREA-057', ASEC, 'Area 641'],
    ['642',  'AREA-058', ASEC, 'Area 642'],
    ['643',  'AREA-059', ASEC, 'Area 643'],
    ['644',  'AREA-060', ASEC, 'Area 644'],
    ['645',  'AREA-061', ASEC, 'Area 645'],
    ['646',  'AREA-062', ASEC, 'Area 646'],
  ];

  for (var i = 0; i < numericAreas.length; i++) {
    var code     = numericAreas[i][0];
    var areaId   = numericAreas[i][1];
    var ctrId    = numericAreas[i][2];
    var areaName = numericAreas[i][3];
    var areaCode = code;
    // Add bare numeric code (as used in legacy Areas sheet Location Code column)
    tryAdd(code,           '', '', areaId, areaCode, areaName, ctrId, 'Numeric location code');
    // Add "Area NNN" name variant (as used in Equipment and LP sheets)
    tryAdd('Area ' + code, '', '', areaId, areaCode, areaName, ctrId, 'Area name variant from Equipment/LP sheet');
  }

  // ── Equipment Register descriptive area values ────────────────────────────
  var eqRegAreas = [
    // [legacy_value, area_id, area_code, area_name, contractor_id]
    ['Kiln1',        'AREA-063', 'Kiln1',        'Kiln Line 1',               RHI],
    ['Kiln2',        'AREA-064', 'Kiln2',         'Kiln Line 2',              ASEC],
    ['RawMill1',     'AREA-065', 'RawMill1',      'Raw Mill 1',               RHI],
    ['RawMill2',     'AREA-066', 'RawMill2',      'Raw Mill 2',               ASEC],
    ['CementMill1',  'AREA-067', 'CementMill1',   'Cement Mill 1',            RHI],
    ['CementMill2',  'AREA-068', 'CementMill2',   'Cement Mill 2',            RHI],
    ['CementMill3',  'AREA-069', 'CementMill3',   'Cement Mill 3',            ASEC],
    ['CementMill4',  'AREA-070', 'CementMill4',   'Cement Mill 4',            ASEC],
    ['CoalMill1',    'AREA-071', 'CoalMill1',     'Coal Mill 1',              RHI],
    ['CoalMill2',    'AREA-072', 'CoalMill2',     'Coal Mill 2',              ASEC],
    ['ClinkerArea1', 'AREA-073', 'ClinkerArea1',  'Clinker Area 1',           RHI],
    ['ClinkerArea2', 'AREA-074', 'ClinkerArea2',  'Clinker Area 2',           ASEC],
    ['GyCrusher',    'AREA-075', 'GyCrusher',     'Gypsum Crusher',           ASEC],
    ['RMCrusher',    'AREA-076', 'RMCrusher',     'Raw Material Crusher',     RHI],
    ['HotDisc',      'AREA-077', 'HotDisc',       'Hot Disc Area',            RHI],
    ['Hydrogen',     'AREA-078', 'Hydrogen',      'Hydrogen Station',         RHI],
    ['PackingArea1', 'AREA-079', 'PackingArea1',  'Packing Area 1',           RHI],
    ['PackingArea2', 'AREA-080', 'PackingArea2',  'Packing Area 2',           ASEC],
    ['AFR',          'AREA-081', 'AFR',           'Alternative Fuels Area',   ASEC],
    ['AFShredding',  'AREA-082', 'AFShredding',   'Alt. Fuels Shredding',     ASEC],
  ];

  for (var j = 0; j < eqRegAreas.length; j++) {
    var ea = eqRegAreas[j];
    tryAdd(ea[0], 'Equipment Register', 'EQ Rigester',
           ea[1], ea[2], ea[3], ea[4], 'Equipment Register area');
  }

  // ── Additional legacy aliases used in various workbook sheets ─────────────
  // Aliases observed in Users_Config or Operational sheets.
  tryAdd('Area 111', '', '',      'AREA-001', '111', 'Crusher',       RHI,  'Area name variant');
  tryAdd('111',      '', '',      'AREA-001', '111', 'Crusher',       RHI,  'Numeric code');
  tryAdd('ASEC-01',  '', '',      'AREA-003', 'ASEC-01', 'ASEC Section', ASEC, 'Legacy ASEC code');
  tryAdd('ASEC',     '', '',      'AREA-003', 'ASEC-01', 'ASEC Section', ASEC, 'ASEC abbreviated');
  tryAdd('ASEC Section', '', '',  'AREA-003', 'ASEC-01', 'ASEC Section', ASEC, 'ASEC full name');
  tryAdd('312',      '', '',      'AREA-002', '312', 'Area 312',      RHI,  'Numeric code');
  tryAdd('Area 312', '', '',      'AREA-002', '312', 'Area 312',      RHI,  'Area name variant');
  // Area 123 was seeded (incorrectly) as → AREA-002 in sample. The numeric code
  // "123" maps correctly to AREA-004. "Area 123" (name form) was already seeded in
  // sample to AREA-002 — we add "123" (code form) to correct target AREA-004.
  // The scoped mapping (with workbook=ACC_Oil_Users_Config) takes priority.
  tryAdd('123', 'ACC_Oil_Users_Config', 'Areas',     'AREA-004', '123', 'Raw Additives L1', RHI, 'Correct target for code 123');
  tryAdd('123', 'ACC_Oil_Users_Config', 'Equipment', 'AREA-004', '123', 'Raw Additives L1', RHI, 'Correct target for code 123 in Equipment');
  tryAdd('Area 123', 'ACC_Oil_Users_Config', 'Equipment', 'AREA-004', '123', 'Raw Additives L1', RHI, 'Correct target for Area 123 in Equipment');
  tryAdd('Area 123', 'ACC_Oil_Operational_Data', 'Lubrication Points', 'AREA-004', '123', 'Raw Additives L1', RHI, 'Correct target for Area 123 in LP');

  if (toAdd.length > 0) {
    smlAppendRows_(sheet, toAdd);
  }
  smlLog_(sheetName + ': added ' + toAdd.length + ' rows');
  return { sheet: sheetName, added: toAdd.length };
}

// ─── OIL TYPE MAPPINGS ────────────────────────────────────────────────────────

/**
 * Seeds Legacy_Oil_Type_Mapping.
 * Maps all 22 legacy lubricant product names (from Lubricant Types / LP sheets)
 * to platform Oil_Types IDs.
 * @returns {{ sheet: string, added: number }}
 */
function smlSeedOilTypeMappings_(ss, ts) {
  var sheetName = 'Legacy_Oil_Type_Mapping';
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    return { sheet: sheetName, added: 0 };
  }

  var existingKeys = smlReadColumnSet_(sheet, 2, true);
  var prefix = 'MAP-OIL';
  var nextId  = smlGetNextMappingId_(sheet, 1, prefix);
  var toAdd   = [];

  // Format: [mapping_id, legacy_value, new_value(oil_type_id), status, notes, created_at, updated_at]
  // Existing: MAP-OIL-001(VG 320→OT-001), MAP-OIL-002(ISO VG 46→OT-002), MAP-OIL-003(Shell Omala S2→OT-001)

  var catalog = [
    // Mobil SHC synthetic gear oil series (all confirmed viscosity grades)
    ['Mobil SHC 630',        'OT-005', 'Mobil SHC synthetic gear oil VG150'],
    ['Mobil SHC 632',        'OT-008', 'Mobil SHC synthetic gear oil VG220'],
    ['Mobil SHC 634',        'OT-001', 'Mobil SHC synthetic gear oil VG320'],
    ['Mobil SHC 636',        'OT-009', 'Mobil SHC synthetic gear oil VG460'],
    ['Mobil SHC 639',        'OT-011', 'Mobil SHC synthetic gear oil VG1000'],
    // Mobilgear 600 XP mineral gear oil series
    ['Mobilgear 600 XP 150', 'OT-005', 'Mobilgear mineral gear oil VG150'],
    ['Mobilgear 600 XP 220', 'OT-008', 'Mobilgear mineral gear oil VG220'],
    ['Mobilgear 600 XP 320', 'OT-001', 'Mobilgear mineral gear oil VG320'],
    ['Mobilgear 600 XP 460', 'OT-009', 'Mobilgear mineral gear oil VG460'],
    // Mobil gear 600 XP (alternate naming in source data)
    ['Mobil gear 600 XP 220',  'OT-008', 'Mobilgear VG220 alternate name'],
    ['Mobil gear 600 XP 320',  'OT-001', 'Mobilgear VG320 alternate name'],
    ['Mobil gear 600 XP 460',  'OT-009', 'Mobilgear VG460 alternate name'],
    ['Mobil gear 600 XP 1000', 'OT-011', 'Mobilgear VG1000 alternate name'],
    // Legacy Mobil gear (older naming)
    ['Mobil gear 629',         'OT-004', 'Legacy Mobil Gear 629 ≈ VG100'],
    // Mobil DTE hydraulic oil series
    ['Mobil DTE 22',           'OT-006', 'Mobil DTE hydraulic oil VG22'],
    ['Mobil DTE 24',           'OT-007', 'Mobil DTE hydraulic oil VG32'],
    ['Mobil DTE 25',           'OT-002', 'Mobil DTE hydraulic oil VG46'],
    ['Mobil DTE 26',           'OT-003', 'Mobil DTE hydraulic oil VG68'],
    ['Mobil DTE Heavy Medium', 'OT-003', 'Mobil DTE Heavy Medium ≈ VG68'],
    ['Mobil DTE Heavy',        'OT-004', 'Mobil DTE Heavy ≈ VG100'],
    // Mobil Vacuoline turbine/circulating oil
    ['Mobil Vacuoline 528',    'OT-007', 'Mobil Vacuoline 528 = VG32'],
    ['Mobil Vacuoline 533',    'OT-004', 'Mobil Vacuoline 533 = VG100'],
    // Mobil specialty oils
    ['Mobil Glygoyle HE 680',  'OT-010', 'Polyglycol gear oil VG680'],
    ['Mobil Rarus 427',        'OT-002', 'Mobil Rarus 427 compressor oil VG46'],
    // FUCHS RENOLIN series
    ['RENOLIN B 46',           'OT-002', 'FUCHS RENOLIN B hydraulic oil VG46'],
    ['RENOLIN B 68',           'OT-003', 'FUCHS RENOLIN B hydraulic oil VG68'],
    ['RENOLIN CLP 150',        'OT-005', 'FUCHS RENOLIN CLP gear oil VG150'],
    ['RENOLIN CLP 220',        'OT-008', 'FUCHS RENOLIN CLP gear oil VG220'],
    ['RENOLIN CLP 320',        'OT-001', 'FUCHS RENOLIN CLP gear oil VG320'],
    ['RENOLIN CLP 460',        'OT-009', 'FUCHS RENOLIN CLP gear oil VG460'],
    // Total series
    ['Total Azolla 46',        'OT-002', 'Total Azolla hydraulic oil VG46'],
    ['Total Azolla ZS 46',     'OT-002', 'Total Azolla ZS hydraulic oil VG46'],
    ['Total Azolla ZS 68',     'OT-003', 'Total Azolla ZS hydraulic oil VG68'],
    ['Total Carter EP 220',    'OT-008', 'Total Carter EP gear oil VG220'],
    ['Total Carter EP 320',    'OT-001', 'Total Carter EP gear oil VG320'],
    ['Total Carter EP 460',    'OT-009', 'Total Carter EP gear oil VG460'],
    // Co-op
    ['Co-op special 1',        'OT-012', 'Co-op Special 1 — grade TBD by engineer'],
    // Generic VG grades (alternate notations not covered by existing MAP-OIL-001/002)
    ['VG 150',                 'OT-005', 'ISO VG 150 grade'],
    ['ISO VG 150',             'OT-005', 'ISO VG 150 grade'],
    ['VG 220',                 'OT-008', 'ISO VG 220 grade'],
    ['ISO VG 220',             'OT-008', 'ISO VG 220 grade'],
    ['VG 320',                 'OT-001', 'ISO VG 320 grade'],
    ['ISO VG 320',             'OT-001', 'ISO VG 320 grade'],
    ['VG 460',                 'OT-009', 'ISO VG 460 grade'],
    ['ISO VG 460',             'OT-009', 'ISO VG 460 grade'],
    ['VG 32',                  'OT-007', 'ISO VG 32 grade'],
    ['ISO VG 32',              'OT-007', 'ISO VG 32 grade'],
    ['VG 22',                  'OT-006', 'ISO VG 22 grade'],
    ['ISO VG 22',              'OT-006', 'ISO VG 22 grade'],
  ];

  for (var i = 0; i < catalog.length; i++) {
    var legacyVal = catalog[i][0];
    var newVal    = catalog[i][1];
    var notes     = catalog[i][2];
    var key = legacyVal.toUpperCase();
    if (!existingKeys[key]) {
      existingKeys[key] = true;
      var id = prefix + '-' + smlPad_(nextId++, 3);
      toAdd.push([id, legacyVal, newVal, 'ACTIVE', notes, ts, ts]);
    }
  }

  if (toAdd.length > 0) {
    smlAppendRows_(sheet, toAdd);
  }
  smlLog_(sheetName + ': added ' + toAdd.length + ' rows');
  return { sheet: sheetName, added: toAdd.length };
}

// ─── OIL BRAND MAPPINGS ───────────────────────────────────────────────────────

/**
 * Seeds Legacy_Oil_Brand_Mapping.
 * Maps legacy brand names (from Lubricant Types sheet Brand column)
 * to platform Oil_Brands IDs.
 * @returns {{ sheet: string, added: number }}
 */
function smlSeedOilBrandMappings_(ss, ts) {
  var sheetName = 'Legacy_Oil_Brand_Mapping';
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    return { sheet: sheetName, added: 0 };
  }

  var existingKeys = smlReadColumnSet_(sheet, 2, true);
  var prefix = 'MAP-OBR';
  var nextId  = smlGetNextMappingId_(sheet, 1, prefix);
  var toAdd   = [];
  // Existing: MAP-OBR-001(Shell→OB-001), MAP-OBR-002(Mobil→OB-003), MAP-OBR-003(Castrol→OB-004)

  var catalog = [
    // Brands that appear in Lubricant Types Brand column (source data):
    ['FUCHS',   'OB-006', 'FUCHS lubricants (RENOLIN series)'],
    ['Total',   'OB-007', 'Total industrial lubricants'],
    ['TOTAL',   'OB-007', 'Total industrial lubricants (uppercase variant)'],
    ['Co-op',   'OB-008', 'Co-op industrial oil'],
    ['COOP',    'OB-008', 'Co-op abbreviation variant'],
    // Additional Mobil product-line entries for specific resolution
    ['Mobilgear', 'OB-009', 'Mobilgear 600 XP series'],
    ['Mobil DTE', 'OB-010', 'Mobil DTE hydraulic series'],
    ['Mobil Glygoyle', 'OB-011', 'Mobil Glygoyle polyglycol series'],
    ['Mobil SHC', 'OB-012', 'Mobil SHC synthetic gear series'],
    ['Mobil Vacuoline', 'OB-013', 'Mobil Vacuoline turbine/vacuum series'],
    ['Mobil Rarus',     'OB-014', 'Mobil Rarus compressor series'],
    // Shell variants
    ['Shell',   'OB-001', 'Generic Shell → Omala S2 family'],
    ['SHELL',   'OB-001', 'Shell uppercase variant'],
    // Castrol variant
    ['CASTROL', 'OB-004', 'Castrol uppercase variant'],
  ];

  for (var i = 0; i < catalog.length; i++) {
    var legacyVal = catalog[i][0];
    var newVal    = catalog[i][1];
    var notes     = catalog[i][2];
    var key = legacyVal.toUpperCase();
    if (!existingKeys[key]) {
      existingKeys[key] = true;
      var id = prefix + '-' + smlPad_(nextId++, 3);
      toAdd.push([id, legacyVal, newVal, 'ACTIVE', notes, ts, ts]);
    }
  }

  if (toAdd.length > 0) {
    smlAppendRows_(sheet, toAdd);
  }
  smlLog_(sheetName + ': added ' + toAdd.length + ' rows');
  return { sheet: sheetName, added: toAdd.length };
}

// ─── EQUIPMENT TYPE MAPPINGS ──────────────────────────────────────────────────

/**
 * Seeds Legacy_Equipment_Type_Mapping with additional equipment type labels.
 * Note: The Equipment sheet in ACC_Oil_Users_Config does NOT have an
 * "Equipment Type" column (only Equipment Code, Asset Name, Area, Contractor).
 * These mappings cover any other source sheet that may contain equipment types.
 * @returns {{ sheet: string, added: number }}
 */
function smlSeedEquipmentTypeMappings_(ss, ts) {
  var sheetName = 'Legacy_Equipment_Type_Mapping';
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    return { sheet: sheetName, added: 0 };
  }

  var existingKeys = smlReadColumnSet_(sheet, 2, true);
  var prefix = 'MAP-EQT';
  var nextId  = smlGetNextMappingId_(sheet, 1, prefix);
  var toAdd   = [];
  // Existing: MAP-EQT-001(Pump→ET-001), MAP-EQT-002(Compressor→ET-002),
  //           MAP-EQT-003(Gearbox→ET-003)

  var catalog = [
    ['Motor',               'ET-004', 'Electric motor'],
    ['Electric Motor',      'ET-004', 'Electric motor full name'],
    ['Fan',                 'ET-005', 'Industrial fan'],
    ['Industrial Fan',      'ET-005', 'Industrial fan full name'],
    ['Centrifugal Fan',     'ET-005', 'Centrifugal fan variant'],
    ['Screw Pump',          'ET-006', 'Screw / positive-displacement pump'],
    ['pump',                'ET-001', 'Lowercase pump variant'],
    ['compressor',          'ET-002', 'Lowercase compressor variant'],
    ['gearbox',             'ET-003', 'Lowercase gearbox variant'],
    ['Gear Box',            'ET-003', 'Two-word gearbox variant'],
    ['Reducer',             'ET-003', 'Gear reducer = gearbox'],
    ['Belt Conveyor',       'ET-007', 'Belt conveyor'],
    ['Conveyor',            'ET-007', 'Generic conveyor'],
    ['Belt',                'ET-007', 'Belt (short form)'],
    ['Chain Scraper',       'ET-007', 'Chain scraper conveyor'],
    ['Screw Conveyor',      'ET-007', 'Screw conveyor variant'],
    ['Crusher',             'ET-008', 'Hammer or jaw crusher'],
    ['Hammer Crusher',      'ET-008', 'Hammer crusher'],
    ['Mill',                'ET-008', 'Ball or tube mill'],
    ['Ball Mill',           'ET-008', 'Ball mill'],
    ['Bucket Elevator',     'ET-009', 'Bucket elevator'],
    ['Elevator',            'ET-009', 'Generic elevator'],
    ['Apron Feeder',        'ET-010', 'Apron feeder'],
    ['Rotary Feeder',       'ET-010', 'Rotary feeder / air lock'],
    ['Feeder',              'ET-010', 'Generic feeder'],
    ['Air Lock',            'ET-010', 'Rotary air lock'],
    ['Rotary Air Lock',     'ET-010', 'Rotary air lock full name'],
    ['Separator',           'ET-011', 'Dynamic separator / classifier'],
    ['Dynamic Separator',   'ET-011', 'Dynamic separator'],
    ['Blower',              'ET-012', 'Rotary blower'],
    ['Rotary Blower',       'ET-012', 'Rotary blower full name'],
    ['Magnetic Separator',  'ET-011', 'Magnetic separator'],
    ['Filter',              'ET-013', 'Industrial filter'],
    ['Filter Screw Conveyor','ET-007','Filter screw conveyor'],
    ['Stacker',             'ET-014', 'Stacker reclaimer'],
    ['Reclaimer',           'ET-014', 'Stacker reclaimer'],
    ['Kiln',                'ET-015', 'Rotary kiln'],
    ['Rotary Kiln',         'ET-015', 'Rotary kiln full name'],
    ['Dryer',               'ET-016', 'Rotary dryer / cooler'],
    ['Cooler',              'ET-016', 'Clinker cooler'],
  ];

  for (var i = 0; i < catalog.length; i++) {
    var legacyVal = catalog[i][0];
    var newVal    = catalog[i][1];
    var notes     = catalog[i][2];
    var key = legacyVal.toUpperCase();
    if (!existingKeys[key]) {
      existingKeys[key] = true;
      var id = prefix + '-' + smlPad_(nextId++, 3);
      toAdd.push([id, legacyVal, newVal, 'ACTIVE', notes, ts, ts]);
    }
  }

  if (toAdd.length > 0) {
    smlAppendRows_(sheet, toAdd);
  }
  smlLog_(sheetName + ': added ' + toAdd.length + ' rows');
  return { sheet: sheetName, added: toAdd.length };
}

// ─── CONTRACTOR MAPPINGS ──────────────────────────────────────────────────────

/**
 * Seeds Legacy_Contractor_Mapping.
 * Source data only has "RHI" and "ASEC" — both already mapped.
 * Adds additional name variants as safety net.
 * @returns {{ sheet: string, added: number }}
 */
function smlSeedContractorMappings_(ss, ts) {
  var sheetName = 'Legacy_Contractor_Mapping';
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    return { sheet: sheetName, added: 0 };
  }

  var existingKeys = smlReadColumnSet_(sheet, 2, true);
  var prefix = 'MAP-CTR';
  var nextId  = smlGetNextMappingId_(sheet, 1, prefix);
  var toAdd   = [];
  // Existing: MAP-CTR-001(RHI→CTR-001), MAP-CTR-002(ASEC→CTR-002)

  var catalog = [
    ['Reliance Heavy Industries', 'CTR-001', 'RHI full name'],
    ['Reliance',                  'CTR-001', 'RHI abbreviated'],
    ['RHI Group',                 'CTR-001', 'RHI Group variant'],
    ['ASEC Cement',               'CTR-002', 'ASEC Cement full name'],
    ['ASEC Group',                'CTR-002', 'ASEC Group variant'],
    ['Lab',                       'CTR-003', 'Oil analysis lab — generic'],
    ['LAB',                       'CTR-003', 'Oil analysis lab — uppercase'],
    ['LAB-01',                    'CTR-003', 'Lab ID variant'],
    ['Oil Lab',                   'CTR-003', 'Oil analysis lab'],
  ];

  for (var i = 0; i < catalog.length; i++) {
    var legacyVal = catalog[i][0];
    var newVal    = catalog[i][1];
    var notes     = catalog[i][2];
    var key = legacyVal.toUpperCase();
    if (!existingKeys[key]) {
      existingKeys[key] = true;
      var id = prefix + '-' + smlPad_(nextId++, 3);
      toAdd.push([id, legacyVal, newVal, 'ACTIVE', notes, ts, ts]);
    }
  }

  if (toAdd.length > 0) {
    smlAppendRows_(sheet, toAdd);
  }
  smlLog_(sheetName + ': added ' + toAdd.length + ' rows');
  return { sheet: sheetName, added: toAdd.length };
}

// ─── STATUS MAPPINGS ──────────────────────────────────────────────────────────

/**
 * Seeds Legacy_Status_Mapping.
 * Covers status values observed in Lubrication History and Action Plans.
 * @returns {{ sheet: string, added: number }}
 */
function smlSeedStatusMappings_(ss, ts) {
  var sheetName = 'Legacy_Status_Mapping';
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    return { sheet: sheetName, added: 0 };
  }

  var existingKeys = smlReadColumnSet_(sheet, 2, true);
  var prefix = 'MAP-STS';
  var nextId  = smlGetNextMappingId_(sheet, 1, prefix);
  var toAdd   = [];
  // Existing: MAP-STS-001(Scheduled→SCHEDULED), MAP-STS-002(Done→COMPLETED),
  //           MAP-STS-003(In Progress→IN_PROGRESS)

  var catalog = [
    ['APPROVED',          'APPROVED',         'History APPROVED status'],
    ['Approved',          'APPROVED',         'Approved mixed-case'],
    ['Completed',         'COMPLETED',        'Completed variant'],
    ['COMPLETED',         'COMPLETED',        'COMPLETED uppercase'],
    ['Complete',          'COMPLETED',        'Complete short form'],
    ['DONE',              'COMPLETED',        'DONE = completed'],
    ['done',              'COMPLETED',        'done lowercase'],
    ['Cancelled',         'CANCELLED',        'Cancelled status'],
    ['CANCELLED',         'CANCELLED',        'CANCELLED uppercase'],
    ['Canceled',          'CANCELLED',        'US spelling variant'],
    ['Overdue',           'OVERDUE',          'Overdue status'],
    ['OVERDUE',           'OVERDUE',          'OVERDUE uppercase'],
    ['Pending',           'SCHEDULED',        'Pending = scheduled'],
    ['PENDING',           'SCHEDULED',        'PENDING uppercase'],
    ['Pending Approval',  'PENDING_APPROVAL', 'Awaiting approval'],
    ['PENDING_APPROVAL',  'PENDING_APPROVAL', 'Pending approval code'],
    ['IN_PROGRESS',       'IN_PROGRESS',      'Already normalized'],
    ['In-Progress',       'IN_PROGRESS',      'Hyphenated variant'],
    ['scheduled',         'SCHEDULED',        'Scheduled lowercase'],
    ['SCHEDULED',         'SCHEDULED',        'SCHEDULED uppercase'],
  ];

  for (var i = 0; i < catalog.length; i++) {
    var legacyVal = catalog[i][0];
    var newVal    = catalog[i][1];
    var notes     = catalog[i][2];
    var key = legacyVal.toUpperCase();
    if (!existingKeys[key]) {
      existingKeys[key] = true;
      var id = prefix + '-' + smlPad_(nextId++, 3);
      toAdd.push([id, legacyVal, newVal, 'ACTIVE', notes, ts, ts]);
    }
  }

  if (toAdd.length > 0) {
    smlAppendRows_(sheet, toAdd);
  }
  smlLog_(sheetName + ': added ' + toAdd.length + ' rows');
  return { sheet: sheetName, added: toAdd.length };
}

// ─── LINE MAPPINGS ────────────────────────────────────────────────────────────

/**
 * Seeds Legacy_Line_Mapping.
 * Equipment Register uses "Line1" / "Line2" which are already valid platform
 * line identifiers (present in Areas.line column → ctx.platform.lines).
 * These entries cover alternate notations just in case.
 * @returns {{ sheet: string, added: number }}
 */
function smlSeedLineMappings_(ss, ts) {
  var sheetName = 'Legacy_Line_Mapping';
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    return { sheet: sheetName, added: 0 };
  }

  var existingKeys = smlReadColumnSet_(sheet, 2, true);
  var prefix = 'MAP-LIN';
  var nextId  = smlGetNextMappingId_(sheet, 1, prefix);
  var toAdd   = [];
  // Existing: MAP-LIN-001(Line 1→Line1), MAP-LIN-002(Kiln Line→Line1),
  //           MAP-LIN-003(Raw Mill L2→Line2)

  var catalog = [
    ['Line1',              'Line1', 'Exact platform value — already valid'],
    ['Line2',              'Line2', 'Exact platform value — already valid'],
    ['LINE1',              'Line1', 'Uppercase variant'],
    ['LINE2',              'Line2', 'Uppercase variant'],
    ['L1',                 'Line1', 'Short form'],
    ['L2',                 'Line2', 'Short form'],
    ['Line 2',             'Line2', 'Spaced format Line 2'],
    ['Production Line 1',  'Line1', 'Full form'],
    ['Production Line 2',  'Line2', 'Full form'],
    ['Kiln Line 1',        'Line1', 'Kiln line descriptor'],
    ['Kiln Line 2',        'Line2', 'Kiln line descriptor'],
    ['Raw Mill Line 1',    'Line1', 'Raw mill line descriptor'],
    ['Raw Mill Line 2',    'Line2', 'Raw mill line descriptor'],
  ];

  for (var i = 0; i < catalog.length; i++) {
    var legacyVal = catalog[i][0];
    var newVal    = catalog[i][1];
    var notes     = catalog[i][2];
    var key = legacyVal.toUpperCase();
    if (!existingKeys[key]) {
      existingKeys[key] = true;
      var id = prefix + '-' + smlPad_(nextId++, 3);
      toAdd.push([id, legacyVal, newVal, 'ACTIVE', notes, ts, ts]);
    }
  }

  if (toAdd.length > 0) {
    smlAppendRows_(sheet, toAdd);
  }
  smlLog_(sheetName + ': added ' + toAdd.length + ' rows');
  return { sheet: sheetName, added: toAdd.length };
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Reads column values from a sheet into a normalized key set.
 * @param {Sheet}   sheet
 * @param {number}  col        1-based column index
 * @param {boolean} normalize  true = UPPERCASE the key
 * @returns {Object} map of key → true
 */
function smlReadColumnSet_(sheet, col, normalize) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return {};
  }
  var values = sheet.getRange(2, col, lastRow - 1, 1).getValues();
  var set = {};
  for (var i = 0; i < values.length; i++) {
    var v = String(values[i][0] || '').trim();
    if (v) {
      set[normalize ? v.toUpperCase() : v] = true;
    }
  }
  return set;
}

/**
 * Finds the next available integer ID for a mapping sheet.
 * Reads column `col` (1-based), extracts trailing integer from each cell
 * matching prefix (e.g. "MAP-AREA-"), returns max + 1.
 * @param {Sheet}  sheet
 * @param {number} col    1-based column index of mapping_id
 * @param {string} prefix e.g. 'MAP-AREA'
 * @returns {number}
 */
function smlGetNextMappingId_(sheet, col, prefix) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return 1;
  }
  var values = sheet.getRange(2, col, lastRow - 1, 1).getValues();
  var maxNum = 0;
  var pUpper = prefix.toUpperCase();
  for (var i = 0; i < values.length; i++) {
    var cell = String(values[i][0] || '').toUpperCase();
    if (cell.indexOf(pUpper) === 0) {
      var numPart = cell.substring(pUpper.length + 1); // strip "MAP-AREA-"
      var n = parseInt(numPart, 10);
      if (!isNaN(n) && n > maxNum) {
        maxNum = n;
      }
    }
  }
  return maxNum + 1;
}

/**
 * Appends rows to a sheet.
 * @param {Sheet}    sheet
 * @param {Array[]}  rows
 */
function smlAppendRows_(sheet, rows) {
  if (!rows || rows.length === 0) {
    return;
  }
  var lastRow = sheet.getLastRow();
  var startRow = Math.max(lastRow + 1, 2);
  var colCount = rows[0].length;
  sheet.getRange(startRow, 1, rows.length, colCount).setValues(rows);
}

/**
 * Zero-pads a number to the given width.
 * @param {number} n
 * @param {number} width
 * @returns {string}
 */
function smlPad_(n, width) {
  var s = String(n);
  while (s.length < width) {
    s = '0' + s;
  }
  return s;
}

/**
 * Returns current timestamp as ISO string (delegates to initializeAccDatabase ts_).
 * @returns {string}
 */
function smlTs_() {
  return Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "yyyy-MM-dd'T'HH:mm:ss"
  );
}

/**
 * Logs a message to the Apps Script execution log.
 * @param {string} msg
 */
function smlLog_(msg) {
  Logger.log('[SeedMappings] ' + msg);
}

// ─── SYNC FROM OFFICIAL AREA SHEET ───────────────────────────────────────────
//
// Source: reference/Master_FN_location_ACC_.xlsx (Sheet1)
//   Columns: Line | Equipment | Sub Area | Equipment Code | machine type | Contractor | Criticality
//   Extracted: Jul 2026  —  1 793 data rows, 75 unique areas after dedup.
//
// GAS cannot read xlsx at runtime, so official data is embedded below.
//
// Run order:
//   syncAreaMappingsFromOfficialSheet()  ← this function
//   previewMasterDataMigration()         ← verify V-MAP-001 = 0
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Syncs Areas and Legacy_Area_Mapping from the official ACC area sheet
 * (Master_FN_location_ACC_.xlsx — source of truth).
 *
 * Rules enforced:
 *   - Append missing Area rows (never delete or overwrite active rows)
 *   - Append missing Legacy_Area_Mapping aliases (numeric code + "Area NNN" form)
 *   - Update only rows whose status is blank or INACTIVE
 *   - Report every field conflict without silently overwriting
 *   - Append CM1/CM2 line identifiers to Legacy_Line_Mapping
 *
 * @returns {{ areasAdded, areasConflicts, mappingAdded, mappingConflicts, lineAdded }}
 */
function syncAreaMappingsFromOfficialSheet() {
  logWorkbookGuard_('syncAreaMappingsFromOfficialSheet', 'MASTER_DATA');

  var masterDataId = getResolvedWorkbookId_('MASTER_DATA');
  var ss = SpreadsheetApp.openById(masterDataId);
  var ts = smlTs_();

  smlLog_('=== syncAreaMappingsFromOfficialSheet START ===');
  smlLog_('Source: reference/Master_FN_location_ACC_.xlsx (embedded, Jul 2026)');

  var report = {
    areasAdded:        0,
    areasConflicts:    [],
    mappingAdded:      0,
    mappingConflicts:  [],
    lineAdded:         0,
  };

  var officialData = samfsOfficialAreaData_();
  var codeToId     = samfsExistingCodeMap_();

  samfsSyncAreas_(ss, ts, officialData, codeToId, report);
  samfsSyncAreaMappings_(ss, ts, officialData, codeToId, report);
  samfsSyncLineMappings_(ss, ts, report);

  smlLog_('=== syncAreaMappingsFromOfficialSheet COMPLETE ===');
  smlLog_('  Areas added:         ' + report.areasAdded);
  smlLog_('  Area conflicts:      ' + report.areasConflicts.length);
  smlLog_('  Mapping rows added:  ' + report.mappingAdded);
  smlLog_('  Mapping conflicts:   ' + report.mappingConflicts.length);
  smlLog_('  Line rows added:     ' + report.lineAdded);

  if (report.areasConflicts.length > 0) {
    smlLog_('--- AREA CONFLICTS (no changes made) ---');
    for (var i = 0; i < report.areasConflicts.length; i++) {
      smlLog_('  ' + report.areasConflicts[i]);
    }
  }
  if (report.mappingConflicts.length > 0) {
    smlLog_('--- MAPPING CONFLICTS (no changes made) ---');
    for (var j = 0; j < report.mappingConflicts.length; j++) {
      smlLog_('  ' + report.mappingConflicts[j]);
    }
  }

  return report;
}

// ─── OFFICIAL DATA (embedded from Master_FN_location_ACC_.xlsx / Sheet1) ─────

/**
 * Official area entries extracted from Master_FN_location_ACC_.xlsx.
 *
 * Each entry: [code, mainArea, officialLine, contractorId, sharedNote]
 *   code          — numeric string ('111') or non-numeric ('UTIS')
 *   mainArea      — Equipment column value (plant section group)
 *   officialLine  — Line column value as-is (Line1 | Line2 | CM1 | CM2)
 *   contractorId  — CTR-001 (RHI) | CTR-002 (ASEC)
 *   sharedNote    — non-empty when the same code appears in a second line (shared area)
 *
 * Shared areas: 462, 466, 851, UTIS appear in two lines with the same contractor.
 * Primary record uses Line1 (or first occurrence); secondary is noted in sharedNote.
 * Rule "one contractor per area" is satisfied (same contractor on both lines).
 *
 * @returns {Array[]}
 */
function samfsOfficialAreaData_() {
  var RHI  = 'CTR-001';
  var ASEC = 'CTR-002';
  return [
    // ── RHI — Raw Material Crusher (Line1) ───────────────────────────────────
    ['111',  'RMCrusher',    'Line1', RHI,  ''],
    ['123',  'RMCrusher',    'Line1', RHI,  ''],
    ['131',  'RMCrusher',    'Line1', RHI,  ''],
    // ── ASEC — Gypsum Crusher (CM2) ──────────────────────────────────────────
    ['213',  'GyCrusher',    'CM2',   ASEC, ''],
    ['222',  'GyCrusher',    'CM2',   ASEC, ''],
    // ── RHI — Coal Mill / HotDisc / AFShredding ───────────────────────────────
    ['241',  'CoalMill1',    'Line1', RHI,  ''],
    ['242',  'CoalMill2',    'Line2', RHI,  ''],
    ['261',  'AFShredding',  'Line2', RHI,  ''],
    ['262',  'HotDisc',      'Line1', RHI,  ''],
    ['263',  'HotDisc',      'Line1', RHI,  ''],
    // ── RHI — Raw Mill 1 / Raw Mill 2 ────────────────────────────────────────
    ['311',  'RawMill1',     'Line1', RHI,  ''],
    ['312',  'RawMill2',     'Line2', RHI,  ''],
    ['321',  'RawMill1',     'Line1', RHI,  ''],
    ['322',  'RawMill2',     'Line2', RHI,  ''],
    ['331',  'RawMill1',     'Line1', RHI,  ''],
    ['332',  'RawMill2',     'Line2', RHI,  ''],
    ['341',  'RawMill1',     'Line1', RHI,  ''],
    ['342',  'RawMill2',     'Line2', RHI,  ''],
    ['351',  'RawMill1',     'Line1', RHI,  ''],
    ['352',  'RawMill2',     'Line2', RHI,  ''],
    // ── RHI — Kiln 1 / Kiln 2 ────────────────────────────────────────────────
    ['421',  'Kiln1',        'Line1', RHI,  ''],
    ['422',  'Kiln2',        'Line2', RHI,  ''],
    ['431',  'Kiln1',        'Line1', RHI,  ''],
    ['432',  'Kiln2',        'Line2', RHI,  ''],
    ['441',  'Kiln1',        'Line1', RHI,  ''],
    ['442',  'Kiln2',        'Line2', RHI,  ''],
    ['451',  'Kiln1',        'Line1', RHI,  ''],
    ['452',  'Kiln2',        'Line2', RHI,  ''],
    ['461',  'Kiln1',        'Line1', RHI,  ''],
    ['462',  'CoalMill1',    'Line1', RHI,  'SHARED: also in Line2/CoalMill2 — same contractor RHI'],
    ['465',  'Kiln1',        'Line1', RHI,  ''],
    ['466',  'CoalMill1',    'Line1', RHI,  'SHARED: also in Line2/CoalMill2 — same contractor RHI'],
    ['471',  'Kiln1',        'Line1', RHI,  ''],
    ['472',  'Kiln2',        'Line2', RHI,  ''],
    // ── ASEC — Clinker Areas (CM1 / CM2) ─────────────────────────────────────
    ['481',  'ClinkerArea1', 'CM1',   ASEC, ''],
    ['482',  'ClinkerArea2', 'CM2',   ASEC, ''],
    // ── ASEC — Cement Mill 1–4 (CM1 / CM2) ───────────────────────────────────
    ['511',  'CementMill1',  'CM1',   ASEC, ''],
    ['512',  'CementMill2',  'CM1',   ASEC, ''],
    ['513',  'CementMill3',  'CM2',   ASEC, ''],
    ['514',  'CementMill4',  'CM2',   ASEC, ''],
    ['531',  'CementMill1',  'CM1',   ASEC, ''],
    ['532',  'CementMill2',  'CM1',   ASEC, ''],
    ['533',  'CementMill3',  'CM2',   ASEC, ''],
    ['534',  'CementMill4',  'CM2',   ASEC, ''],
    ['541',  'CementMill1',  'CM1',   ASEC, ''],
    ['542',  'CementMill2',  'CM1',   ASEC, ''],
    ['543',  'CementMill3',  'CM2',   ASEC, ''],
    ['544',  'CementMill4',  'CM2',   ASEC, ''],
    ['611',  'CementMill1',  'CM1',   ASEC, ''],
    ['612',  'CementMill2',  'CM1',   ASEC, ''],
    ['613',  'PackingArea2', 'CM2',   ASEC, ''],
    ['614',  'PackingArea2', 'CM2',   ASEC, ''],
    ['621',  'CementMill1',  'CM1',   ASEC, ''],
    ['622',  'CementMill3',  'CM2',   ASEC, ''],
    // ── ASEC — Packing Areas (CM1 / CM2) ─────────────────────────────────────
    ['641',  'PackingArea1', 'CM1',   ASEC, ''],
    ['642',  'PackingArea1', 'CM1',   ASEC, ''],
    ['643',  'PackingArea1', 'CM1',   ASEC, ''],
    ['644',  'PackingArea2', 'CM2',   ASEC, ''],
    ['645',  'PackingArea2', 'CM2',   ASEC, ''],
    ['646',  'PackingArea2', 'CM2',   ASEC, ''],
    // ── NEW: RHI — Kiln 1/2 additional sub-areas (711–764) ───────────────────
    ['711',  'Kiln1',        'Line1', RHI,  ''],
    ['712',  'Kiln2',        'Line2', RHI,  ''],
    ['721',  'Kiln1',        'Line1', RHI,  ''],
    ['722',  'Kiln2',        'Line2', RHI,  ''],
    ['741',  'Kiln1',        'Line1', RHI,  ''],
    ['742',  'CementMill1',  'CM1',   ASEC, ''],
    ['743',  'Kiln2',        'Line2', RHI,  ''],
    ['744',  'CementMill3',  'CM2',   ASEC, ''],
    ['761',  'Kiln1',        'Line1', RHI,  ''],
    ['762',  'Kiln2',        'Line2', RHI,  ''],
    ['764',  'RawMill2',     'Line2', RHI,  ''],
    // ── NEW: RHI — Coal Mill additional sub-areas (851–852) ──────────────────
    ['851',  'CoalMill1',    'Line1', RHI,  'SHARED: also in Line2/CoalMill2 — same contractor RHI'],
    ['852',  'CoalMill2',    'Line2', RHI,  ''],
    // ── NEW: RHI — Utilities (UTIS) ──────────────────────────────────────────
    ['UTIS', 'Hydrogen',     'Line1', RHI,  'SHARED: also in Line2/Hydrogen — same contractor RHI'],
  ];
}

/**
 * Maps existing numeric area codes to their pre-assigned platform area_ids
 * (AREA-001 through AREA-062, assigned before area codes were fully known).
 * Codes not present here will receive a new AREA-{code} style id.
 * @returns {Object} code (string) → area_id (string)
 */
function samfsExistingCodeMap_() {
  return {
    '111': 'AREA-001', '312': 'AREA-002',
    '123': 'AREA-004', '131': 'AREA-006',
    '241': 'AREA-007', '242': 'AREA-008',
    '261': 'AREA-009', '262': 'AREA-010', '263': 'AREA-011',
    '311': 'AREA-012', '321': 'AREA-013',
    '322': 'AREA-014', '331': 'AREA-015',
    '332': 'AREA-016', '341': 'AREA-017',
    '342': 'AREA-018', '351': 'AREA-019',
    '352': 'AREA-020',
    '421': 'AREA-021', '422': 'AREA-022',
    '431': 'AREA-023', '432': 'AREA-024',
    '441': 'AREA-025', '442': 'AREA-026',
    '451': 'AREA-027', '452': 'AREA-028',
    '461': 'AREA-029', '462': 'AREA-030',
    '465': 'AREA-031', '466': 'AREA-032',
    '471': 'AREA-033', '472': 'AREA-034',
    '213': 'AREA-035', '222': 'AREA-036',
    '481': 'AREA-037', '482': 'AREA-038',
    '511': 'AREA-039', '512': 'AREA-040',
    '513': 'AREA-041', '514': 'AREA-042',
    '531': 'AREA-043', '532': 'AREA-044',
    '533': 'AREA-045', '534': 'AREA-046',
    '541': 'AREA-047', '542': 'AREA-048',
    '543': 'AREA-049', '544': 'AREA-050',
    '611': 'AREA-051', '612': 'AREA-052',
    '613': 'AREA-053', '614': 'AREA-054',
    '621': 'AREA-055', '622': 'AREA-056',
    '641': 'AREA-057', '642': 'AREA-058',
    '643': 'AREA-059', '644': 'AREA-060',
    '645': 'AREA-061', '646': 'AREA-062',
    // 711–UTIS → new AREA-{code} ids (no legacy mapping)
  };
}

// ─── SYNC HELPERS ─────────────────────────────────────────────────────────────

/**
 * Syncs the Areas sheet from official data.
 * Appends rows for area_ids not yet present; reports line/contractor conflicts
 * for existing rows without overwriting them.
 *
 * Areas schema (9 cols):
 *   A=area_id, B=area_code, C=area_name, D=main_area,
 *   E=line, F=responsible_contractor_id, G=status, H=created_at, I=updated_at
 */
function samfsSyncAreas_(ss, ts, officialData, codeToId, report) {
  var sheet = ss.getSheetByName('Areas');
  if (!sheet) {
    smlLog_('ERROR: Areas sheet not found — skipping area sync');
    return;
  }

  var existing = samfsReadAreaRows_(sheet);
  var toAdd    = [];

  for (var i = 0; i < officialData.length; i++) {
    var d            = officialData[i];
    var code         = d[0];
    var mainArea     = d[1];
    var officialLine = d[2];
    var contractorId = d[3];
    var sharedNote   = d[4];
    var areaId       = codeToId[code] || ('AREA-' + code);
    var areaName     = 'Area ' + code;

    if (sharedNote) {
      report.areasConflicts.push(
        'SHARED_AREA [' + areaId + '] code=' + code + ': ' + sharedNote);
    }

    if (!existing[areaId]) {
      toAdd.push([areaId, code, areaName, mainArea, officialLine, contractorId,
                  'ACTIVE', ts, ts]);
      smlLog_('Areas: queued new ' + areaId + ' code=' + code +
              ' line=' + officialLine + ' ctr=' + contractorId);
    } else {
      var ex = existing[areaId];
      if (ex.line !== officialLine) {
        report.areasConflicts.push(
          'LINE_MISMATCH [' + areaId + '] code=' + code +
          ': official=' + officialLine + ' existing=' + ex.line +
          ' — contractor OK. Manual update required.');
      }
      if (ex.contractorId && ex.contractorId !== contractorId) {
        report.areasConflicts.push(
          'CONTRACTOR_MISMATCH [' + areaId + '] code=' + code +
          ': official=' + contractorId + ' existing=' + ex.contractorId);
      }
    }
  }

  if (toAdd.length > 0) {
    smlAppendRows_(sheet, toAdd);
    report.areasAdded += toAdd.length;
    smlLog_('Areas: appended ' + toAdd.length + ' rows');
  } else {
    smlLog_('Areas: no new rows to append');
  }
}

/**
 * Reads all data rows from the Areas sheet into a map keyed by area_id.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @returns {Object} areaId → { areaCode, line, contractorId, status }
 */
function samfsReadAreaRows_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return {};
  // Read 9 columns: A-I
  var data = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
  var map  = {};
  for (var i = 0; i < data.length; i++) {
    var areaId = String(data[i][0] || '').trim();
    if (!areaId) continue;
    map[areaId] = {
      areaCode:     String(data[i][1] || '').trim(),
      areaName:     String(data[i][2] || '').trim(),
      mainArea:     String(data[i][3] || '').trim(),
      line:         String(data[i][4] || '').trim(),
      contractorId: String(data[i][5] || '').trim(),
      status:       String(data[i][6] || '').trim(),
    };
  }
  return map;
}

/**
 * Syncs Legacy_Area_Mapping from official data.
 * Adds aliases for each official area: numeric code ("111") and text form ("Area 111").
 * Reports but does not overwrite conflicts on ACTIVE rows.
 * Logs inactive/blank-status conflicts for manual review.
 *
 * Mapping schema (12 cols):
 *   A=mapping_id, B=legacy_value, C=legacy_workbook, D=legacy_sheet,
 *   E=new_area_id, F=new_area_code, G=new_area_name,
 *   H=responsible_contractor_id, I=status, J=notes, K=created_at, L=updated_at
 */
function samfsSyncAreaMappings_(ss, ts, officialData, codeToId, report) {
  var sheetName = 'Legacy_Area_Mapping';
  var sheet     = ss.getSheetByName(sheetName);
  if (!sheet) {
    smlLog_('ERROR: ' + sheetName + ' not found — skipping mapping sync');
    return;
  }

  var existingMap = samfsReadMappingRows_(sheet);
  var prefix      = 'MAP-AREA';
  var nextId      = smlGetNextMappingId_(sheet, 1, prefix);
  var toAdd       = [];

  function tryAdd(legacyVal, areaId, areaCode, areaName, contractorId, notes) {
    var key = legacyVal.toUpperCase();
    if (existingMap[key]) {
      var ex = existingMap[key];
      if (ex.newAreaId !== areaId) {
        var msg = 'WRONG_TARGET legacy_value="' + legacyVal +
          '" existing=' + ex.newAreaId + ' expected=' + areaId +
          ' status=' + (ex.status || 'blank');
        if (!ex.status || ex.status === 'INACTIVE') {
          report.mappingConflicts.push(msg + ' — inactive/blank: manual update recommended');
        } else {
          report.mappingConflicts.push(msg + ' — ACTIVE: do NOT overwrite; manual review');
        }
      }
      return; // Do not add duplicate regardless
    }
    existingMap[key] = { newAreaId: areaId }; // prevent within-batch duplicates
    var id = prefix + '-' + smlPad_(nextId++, 3);
    toAdd.push([id, legacyVal, '', '', areaId, areaCode, areaName,
                contractorId, 'ACTIVE', notes, ts, ts]);
  }

  for (var i = 0; i < officialData.length; i++) {
    var d            = officialData[i];
    var code         = d[0];
    var contractorId = d[3];
    var areaId       = codeToId[code] || ('AREA-' + code);
    var areaName     = 'Area ' + code;
    var src          = 'From Master_FN_location_ACC_';

    tryAdd(code,           areaId, code, areaName, contractorId, src + ' — numeric code');
    tryAdd('Area ' + code, areaId, code, areaName, contractorId, src + ' — text form');
  }

  if (toAdd.length > 0) {
    smlAppendRows_(sheet, toAdd);
    report.mappingAdded += toAdd.length;
    smlLog_(sheetName + ': appended ' + toAdd.length + ' rows');
  } else {
    smlLog_(sheetName + ': no new rows to append');
  }
}

/**
 * Reads Legacy_Area_Mapping into a normalized map.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @returns {Object} UPPER(legacy_value) → { mappingId, newAreaId, status }
 */
function samfsReadMappingRows_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return {};
  // Read 12 columns: A–L
  var data = sheet.getRange(2, 1, lastRow - 1, 12).getValues();
  var map  = {};
  for (var i = 0; i < data.length; i++) {
    var legacyVal = String(data[i][1] || '').trim(); // col B
    if (!legacyVal) continue;
    var key = legacyVal.toUpperCase();
    map[key] = {
      mappingId: String(data[i][0] || '').trim(), // col A
      newAreaId: String(data[i][4] || '').trim(), // col E
      status:    String(data[i][8] || '').trim(), // col I
    };
  }
  return map;
}

/**
 * Appends CM1 and CM2 line identifiers to Legacy_Line_Mapping if missing.
 * These are the official line codes used in Master_FN_location_ACC_.xlsx
 * for ASEC cement-mill and packing areas.
 *
 * Line mapping schema (7 cols):
 *   A=mapping_id, B=legacy_value, C=new_value,
 *   D=status, E=notes, F=created_at, G=updated_at
 */
function samfsSyncLineMappings_(ss, ts, report) {
  var sheetName = 'Legacy_Line_Mapping';
  var sheet     = ss.getSheetByName(sheetName);
  if (!sheet) {
    smlLog_('WARN: ' + sheetName + ' not found — skipping line sync');
    return;
  }

  var existingKeys = smlReadColumnSet_(sheet, 2, true); // col B normalized
  var prefix = 'MAP-LIN';
  var nextId = smlGetNextMappingId_(sheet, 1, prefix);
  var toAdd  = [];

  var catalog = [
    ['CM1', 'CM1', 'Cement Mill Line 1 — official line code from Master_FN_location_ACC_'],
    ['CM2', 'CM2', 'Cement Mill Line 2 — official line code from Master_FN_location_ACC_'],
    ['cm1', 'CM1', 'CM1 lowercase variant'],
    ['cm2', 'CM2', 'CM2 lowercase variant'],
  ];

  for (var i = 0; i < catalog.length; i++) {
    var legacyVal = catalog[i][0];
    var newVal    = catalog[i][1];
    var notes     = catalog[i][2];
    var key = legacyVal.toUpperCase();
    if (!existingKeys[key]) {
      existingKeys[key] = true;
      var id = prefix + '-' + smlPad_(nextId++, 3);
      toAdd.push([id, legacyVal, newVal, 'ACTIVE', notes, ts, ts]);
    }
  }

  if (toAdd.length > 0) {
    smlAppendRows_(sheet, toAdd);
    report.lineAdded += toAdd.length;
    smlLog_(sheetName + ': appended ' + toAdd.length + ' line rows (CM1/CM2)');
  } else {
    smlLog_(sheetName + ': CM1/CM2 already present — no rows added');
  }
}
