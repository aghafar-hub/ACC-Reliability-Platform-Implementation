/**
 * ACC Reliability Platform — Master Data Dry-Run Migration
 * File: apps-script/migration/dryRunMasterDataMigration.gs
 *
 * PREVIEW ONLY — writes migrated rows to *_PREVIEW sheets and Migration_Dry_Run_Summary.
 * Does NOT write to production master sheets or modify source workbooks.
 *
 * Uses the same mapping resolution engine as previewMasterDataMigration().
 *
 * Run: dryRunMasterDataMigration()
 */

var MIGRATION_DRY_RUN = {
  SPRINT: '08',
  SUMMARY_SHEET: 'Migration_Dry_Run_Summary',
  PREVIEW_SHEETS: {
    EQUIPMENT: 'Equipment_Master_PREVIEW',
    LP: 'LP_Master_PREVIEW',
    OIL_TYPES: 'Oil_Types_PREVIEW',
    OIL_BRANDS: 'Oil_Brands_PREVIEW',
    OIL_PRODUCTS: 'Oil_Products_PREVIEW',
    LINE_ASSIGNMENTS: 'Equipment_Line_Assignments_PREVIEW',
  },
  HEADERS: {
    EQUIPMENT: [
      'equipment_id', 'equipment_tag', 'equipment_name', 'area_id', 'equipment_type_id',
      'parent_equipment_id', 'criticality', 'status', 'created_at', 'updated_at',
    ],
    LP: [
      'lp_id', 'equipment_id', 'lp_name', 'lube_point_type', 'oil_type_id', 'oil_brand_id',
      'oil_capacity_liters', 'change_interval_days', 'sampling_required', 'sampling_interval_days',
      'status', 'created_at', 'updated_at',
    ],
    OIL_TYPES: [
      'oil_type_id', 'type_code', 'type_name', 'viscosity_grade', 'base_type',
      'application_notes', 'is_active', 'created_at',
    ],
    OIL_BRANDS: [
      'brand_id', 'brand_name', 'manufacturer', 'product_line', 'is_active', 'created_at',
    ],
    OIL_PRODUCTS: [
      'oil_product_id', 'oil_type_id', 'oil_brand_id', 'product_name', 'iso_vg', 'application',
      'oem_approval', 'density', 'viscosity', 'flash_point', 'msds_url', 'safety_notes',
      'status', 'created_at', 'updated_at',
    ],
    LINE_ASSIGNMENTS: [
      'assignment_id', 'line', 'area', 'equipment_code', 'source_workbook', 'source_sheet',
      'source_row', 'status', 'created_at', 'updated_at',
    ],
  },
};

/**
 * Main entry — reads legacy sources, applies mapping logic, writes *_PREVIEW sheets only.
 * @returns {Object} dry-run summary payload (also logged)
 */
function dryRunMasterDataMigration() {
  var started = new Date();
  mdrLog_('=== Master Data Dry-Run Migration START (Sprint ' + MIGRATION_DRY_RUN.SPRINT + ') ===');

  var targetId = mpRequireProp_(MIGRATION_PREVIEW.TARGET_PROP);
  logWorkbookGuard_('dryRunMasterDataMigration', 'MASTER_DATA');
  var sourceIds = mpLoadSourceIds_();
  mpAssertProtectedSheetsUntouched_(targetId);

  var context = mpBuildContext_(targetId, sourceIds);
  var findings = [];

  mpCollectSourceCounts_(context, findings);
  mpValidateMappingDefinitions_(context, findings);
  mpValidateAreas_(context, findings);
  mpValidateEquipment_(context, findings);
  mpValidateLubricationPoints_(context, findings);
  mpValidateLubricantTypes_(context, findings);
  mpValidateEquipmentRegister_(context, findings);
  mpValidateDates_(context, findings);
  mpEmitUnmappedFindings_(context, findings);

  var ts = new Date().toISOString();
  var equipResult = mdrTransformEquipment_(context, ts);
  var oilTypesResult = mdrTransformOilTypes_(context, ts);
  var oilBrandsResult = mdrTransformOilBrands_(context, ts);
  var oilProductsResult = mdrTransformOilProducts_(context, ts, oilTypesResult.byName, oilBrandsResult.byName);
  var lpResult = mdrTransformLps_(context, ts, equipResult.tagToId, oilTypesResult.byName, oilBrandsResult.byName);
  var lineResult = mdrTransformLineAssignments_(context, ts);

  var previewCounts = {
    Equipment_Master_PREVIEW: equipResult.rows.length,
    LP_Master_PREVIEW: lpResult.rows.length,
    Oil_Types_PREVIEW: oilTypesResult.rows.length,
    Oil_Brands_PREVIEW: oilBrandsResult.rows.length,
    Oil_Products_PREVIEW: oilProductsResult.rows.length,
    Equipment_Line_Assignments_PREVIEW: lineResult.rows.length,
  };

  var summary = mdrBuildDryRunSummary_(context, findings, previewCounts, ts);
  mdrWritePreviewSheets_(targetId, {
    equipment: equipResult.rows,
    lps: lpResult.rows,
    oilTypes: oilTypesResult.rows,
    oilBrands: oilBrandsResult.rows,
    oilProducts: oilProductsResult.rows,
    lineAssignments: lineResult.rows,
  });
  mdrWriteDryRunSummary_(targetId, summary, context, findings);

  mpAssertProtectedSheetsUntouched_(targetId);

  var elapsed = Math.round((new Date() - started) / 1000);
  mdrLog_('Dry-run complete in ' + elapsed + 's — preview rows=' + summary.totalPreviewRows
    + ' errors=' + summary.errorCount + ' warnings=' + summary.warningCount);
  return summary;
}

// ─── TRANSFORM: EQUIPMENT ─────────────────────────────────────────────────────

/**
 * @param {Object} ctx
 * @param {string} ts
 * @returns {{ rows: Array[], tagToId: Object }}
 */
function mdrTransformEquipment_(ctx, ts) {
  var headers = MIGRATION_DRY_RUN.HEADERS.EQUIPMENT;
  var rows = [];
  var tagToId = {};
  var seq = 0;
  var seenTags = {};

  for (var i = 0; i < ctx.equipment.rows.length; i++) {
    var row = ctx.equipment.rows[i];
    var tag = mpCell_(row, ctx.equipment.index, 'Equipment Code');
    if (!tag) {
      continue;
    }

    var tagKey = mpNormalizeKey_(tag);
    if (seenTags[tagKey]) {
      continue;
    }
    seenTags[tagKey] = true;

    seq++;
    var equipmentId = 'EQP-' + mdrPad_(seq, 4);
    tagToId[tagKey] = equipmentId;

    var areaVal = mpCell_(row, ctx.equipment.index, 'Area');
    var eqType = mpCell_(row, ctx.equipment.index, 'Equipment Type');
    var assetName = mpCell_(row, ctx.equipment.index, 'Asset Name')
      || mpCell_(row, ctx.equipment.index, 'Equipment Name')
      || tag;

    rows.push(mdrRow_(headers, {
      equipment_id: equipmentId,
      equipment_tag: tag,
      equipment_name: assetName,
      area_id: mdrResolveAreaId_(ctx, areaVal, ctx.equipment.workbook, ctx.equipment.sheet),
      equipment_type_id: mdrResolveEquipmentTypeId_(ctx, eqType),
      parent_equipment_id: '',
      criticality: mdrNormalizeCriticality_(mpCell_(row, ctx.equipment.index, 'Criticality')),
      status: 'ACTIVE',
      created_at: ts,
      updated_at: ts,
    }));
  }

  return { rows: rows, tagToId: tagToId };
}

// ─── TRANSFORM: LP ───────────────────────────────────────────────────────────

/**
 * @param {Object} ctx
 * @param {string} ts
 * @param {Object} tagToId
 * @param {Object} oilTypeByName
 * @param {Object} brandByName
 * @returns {{ rows: Array[] }}
 */
function mdrTransformLps_(ctx, ts, tagToId, oilTypeByName, brandByName) {
  var headers = MIGRATION_DRY_RUN.HEADERS.LP;
  var rows = [];
  var seenLp = {};

  for (var i = 0; i < ctx.lps.rows.length; i++) {
    var row = ctx.lps.rows[i];
    var lpId = mpCell_(row, ctx.lps.index, 'LP ID');
    if (!lpId) {
      continue;
    }

    var lpKey = mpNormalizeKey_(lpId);
    if (seenLp[lpKey]) {
      continue;
    }
    seenLp[lpKey] = true;

    var equipCode = mpCell_(row, ctx.lps.index, 'Equipment Code');
    var equipId = tagToId[mpNormalizeKey_(equipCode)] || '';
    var oilTypeName = mpCell_(row, ctx.lps.index, 'Lubricant Type');
    var oilTypeId = mdrResolveOilTypeId_(ctx, oilTypeName);
    if (!oilTypeId && oilTypeName) {
      var oilTypePreview = oilTypeByName[mpNormalizeKey_(oilTypeName)];
      oilTypeId = oilTypePreview ? oilTypePreview.oil_type_id : '';
    }

    var brandName = mdrLookupBrandForOilType_(ctx, oilTypeName);
    var brandId = mdrResolveOilBrandId_(ctx, brandName);
    if (!brandId && brandName) {
      var brandPreview = brandByName[mpNormalizeKey_(brandName)];
      brandId = brandPreview ? brandPreview.brand_id : '';
    }

    var lpName = mpCell_(row, ctx.lps.index, 'Point Description')
      || mpCell_(row, ctx.lps.index, 'Equipment Name')
      || lpId;
    var position = mpCell_(row, ctx.lps.index, 'Position');
    var qty = mpCell_(row, ctx.lps.index, 'Standard Qty (L)');
    var changeDays = mpCell_(row, ctx.lps.index, 'Frequency Interval (days)');
    var samplingRequired = mpCell_(row, ctx.lps.index, 'Oil Analysis Required');
    var samplingDays = mpCell_(row, ctx.lps.index, 'OA Interval (days)');

    rows.push(mdrRow_(headers, {
      lp_id: lpId,
      equipment_id: equipId,
      lp_name: lpName,
      lube_point_type: mdrMapLubePointType_(position),
      oil_type_id: oilTypeId,
      oil_brand_id: brandId,
      oil_capacity_liters: mdrParseNumber_(qty),
      change_interval_days: mdrParseNumber_(changeDays),
      sampling_required: mdrParseBoolean_(samplingRequired) ? 'TRUE' : 'FALSE',
      sampling_interval_days: mdrParseNumber_(samplingDays),
      status: 'ACTIVE',
      created_at: ts,
      updated_at: ts,
    }));
  }

  return { rows: rows };
}

// ─── TRANSFORM: OIL TYPES / BRANDS / PRODUCTS ─────────────────────────────────

/**
 * @param {Object} ctx
 * @param {string} ts
 * @returns {{ rows: Array[], byName: Object }}
 */
function mdrTransformOilTypes_(ctx, ts) {
  var headers = MIGRATION_DRY_RUN.HEADERS.OIL_TYPES;
  var rows = [];
  var byName = {};
  var seen = {};
  var seq = 0;

  for (var i = 0; i < ctx.lubricantTypes.rows.length; i++) {
    var row = ctx.lubricantTypes.rows[i];
    var name = mpCell_(row, ctx.lubricantTypes.index, 'Name');
    if (!name) {
      continue;
    }

    var key = mpNormalizeKey_(name);
    if (seen[key]) {
      continue;
    }
    seen[key] = true;

    var resolvedId = mdrResolveOilTypeId_(ctx, name);
    seq++;
    var oilTypeId = resolvedId || ('OT-PREV-' + mdrPad_(seq, 4));
    var vg = mdrExtractVgGrade_(name);

    var record = {
      oil_type_id: oilTypeId,
      type_code: vg || mdrSlugCode_(name),
      type_name: name,
      viscosity_grade: vg,
      base_type: '',
      application_notes: '',
      is_active: 'TRUE',
      created_at: ts,
    };

    rows.push(mdrRow_(headers, record));
    byName[key] = record;
  }

  return { rows: rows, byName: byName };
}

/**
 * @param {Object} ctx
 * @param {string} ts
 * @returns {{ rows: Array[], byName: Object }}
 */
function mdrTransformOilBrands_(ctx, ts) {
  var headers = MIGRATION_DRY_RUN.HEADERS.OIL_BRANDS;
  var rows = [];
  var byName = {};
  var seen = {};
  var seq = 0;

  for (var i = 0; i < ctx.lubricantTypes.rows.length; i++) {
    var row = ctx.lubricantTypes.rows[i];
    var brand = mpCell_(row, ctx.lubricantTypes.index, 'Brand');
    if (!brand) {
      continue;
    }

    var key = mpNormalizeKey_(brand);
    if (seen[key]) {
      continue;
    }
    seen[key] = true;

    var resolvedId = mdrResolveOilBrandId_(ctx, brand);
    seq++;
    var brandId = resolvedId || ('OB-PREV-' + mdrPad_(seq, 4));

    var record = {
      brand_id: brandId,
      brand_name: brand,
      manufacturer: brand,
      product_line: '',
      is_active: 'TRUE',
      created_at: ts,
    };

    rows.push(mdrRow_(headers, record));
    byName[key] = record;
  }

  return { rows: rows, byName: byName };
}

/**
 * @param {Object} ctx
 * @param {string} ts
 * @param {Object} oilTypeByName
 * @param {Object} brandByName
 * @returns {{ rows: Array[] }}
 */
function mdrTransformOilProducts_(ctx, ts, oilTypeByName, brandByName) {
  var headers = MIGRATION_DRY_RUN.HEADERS.OIL_PRODUCTS;
  var rows = [];
  var seen = {};
  var seq = 0;

  for (var i = 0; i < ctx.lubricantTypes.rows.length; i++) {
    var row = ctx.lubricantTypes.rows[i];
    var name = mpCell_(row, ctx.lubricantTypes.index, 'Name');
    var brand = mpCell_(row, ctx.lubricantTypes.index, 'Brand');
    if (!name) {
      continue;
    }

    var key = mpNormalizeKey_(name) + '|' + mpNormalizeKey_(brand);
    if (seen[key]) {
      continue;
    }
    seen[key] = true;

    var oilTypeId = mdrResolveOilTypeId_(ctx, name);
    if (!oilTypeId) {
      var ot = oilTypeByName[mpNormalizeKey_(name)];
      oilTypeId = ot ? ot.oil_type_id : '';
    }

    var brandId = mdrResolveOilBrandId_(ctx, brand);
    if (!brandId && brand) {
      var br = brandByName[mpNormalizeKey_(brand)];
      brandId = br ? br.brand_id : '';
    }

    seq++;
    var vg = mdrExtractVgGrade_(name);

    rows.push(mdrRow_(headers, {
      oil_product_id: 'OP-PREV-' + mdrPad_(seq, 4),
      oil_type_id: oilTypeId,
      oil_brand_id: brandId,
      product_name: brand ? name + ' / ' + brand : name,
      iso_vg: vg,
      application: '',
      oem_approval: '',
      density: '',
      viscosity: vg,
      flash_point: '',
      msds_url: '',
      safety_notes: '',
      status: 'ACTIVE',
      created_at: ts,
      updated_at: ts,
    }));
  }

  return { rows: rows };
}

// ─── TRANSFORM: LINE ASSIGNMENTS ──────────────────────────────────────────────

/**
 * @param {Object} ctx
 * @param {string} ts
 * @returns {{ rows: Array[] }}
 */
function mdrTransformLineAssignments_(ctx, ts) {
  var headers = MIGRATION_DRY_RUN.HEADERS.LINE_ASSIGNMENTS;
  var rows = [];
  var seq = 0;

  for (var i = 0; i < ctx.equipmentRegister.rows.length; i++) {
    var row = ctx.equipmentRegister.rows[i];
    var code = mpCell_(row, ctx.equipmentRegister.index, 'Equipment Code');
    if (!code) {
      continue;
    }

    seq++;
    var lineVal = mpCell_(row, ctx.equipmentRegister.index, 'Line');
    var lineRes = mdrResolveLineValue_(ctx, lineVal);

    rows.push(mdrRow_(headers, {
      assignment_id: 'ELA-PREV-' + mdrPad_(seq, 4),
      line: lineRes || lineVal,
      area: mpCell_(row, ctx.equipmentRegister.index, 'Area'),
      equipment_code: code,
      source_workbook: ctx.equipmentRegister.workbook,
      source_sheet: ctx.equipmentRegister.sheet,
      source_row: row._sourceRow,
      status: 'ACTIVE',
      created_at: ts,
      updated_at: ts,
    }));
  }

  return { rows: rows };
}

// ─── PREVIEW SHEET WRITER ─────────────────────────────────────────────────────

/**
 * @param {string} targetId
 * @param {Object} data
 */
function mdrWritePreviewSheets_(targetId, data) {
  var ss = SpreadsheetApp.openById(targetId);
  var sheets = MIGRATION_DRY_RUN.PREVIEW_SHEETS;
  var hdrs = MIGRATION_DRY_RUN.HEADERS;

  mdrWritePreviewSheet_(ss, sheets.EQUIPMENT, hdrs.EQUIPMENT, data.equipment);
  mdrWritePreviewSheet_(ss, sheets.LP, hdrs.LP, data.lps);
  mdrWritePreviewSheet_(ss, sheets.OIL_TYPES, hdrs.OIL_TYPES, data.oilTypes);
  mdrWritePreviewSheet_(ss, sheets.OIL_BRANDS, hdrs.OIL_BRANDS, data.oilBrands);
  mdrWritePreviewSheet_(ss, sheets.OIL_PRODUCTS, hdrs.OIL_PRODUCTS, data.oilProducts);
  mdrWritePreviewSheet_(ss, sheets.LINE_ASSIGNMENTS, hdrs.LINE_ASSIGNMENTS, data.lineAssignments);
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} sheetName
 * @param {string[]} headers
 * @param {Array[]} dataRows
 */
function mdrWritePreviewSheet_(ss, sheetName, headers, dataRows) {
  var sheet = mdrReplaceSheet_(ss, sheetName);
  var allRows = [headers].concat(dataRows || []);
  if (allRows.length > 0) {
    sheet.getRange(1, 1, allRows.length, headers.length).setValues(
      mpPadRows_(allRows, headers.length)
    );
  }
  sheet.setFrozenRows(1);
  if (headers.length > 0) {
    sheet.autoResizeColumns(1, headers.length);
  }
}

/**
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} sheetName
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function mdrReplaceSheet_(ss, sheetName) {
  var existing = ss.getSheetByName(sheetName);
  if (existing) {
    ss.deleteSheet(existing);
  }
  return ss.insertSheet(sheetName);
}

// ─── SUMMARY ──────────────────────────────────────────────────────────────────

/**
 * @param {Object} ctx
 * @param {Object[]} findings
 * @param {Object} previewCounts
 * @param {string} ts
 * @returns {Object}
 */
function mdrBuildDryRunSummary_(ctx, findings, previewCounts, ts) {
  var severityCounts = { INFO: 0, WARNING: 0, ERROR: 0, BLOCKER: 0 };
  for (var i = 0; i < findings.length; i++) {
    var sev = findings[i].severity;
    if (severityCounts[sev] !== undefined) {
      severityCounts[sev]++;
    }
  }

  var totalPreview = 0;
  for (var key in previewCounts) {
    if (previewCounts.hasOwnProperty(key)) {
      totalPreview += previewCounts[key];
    }
  }

  return {
    generatedAt: ts,
    sprint: MIGRATION_DRY_RUN.SPRINT,
    mode: 'DRY-RUN — preview sheets only, no production writes',
    sourceCounts: ctx.sourceCounts,
    previewCounts: previewCounts,
    totalPreviewRows: totalPreview,
    duplicateEquipmentIds: mdrCountFindingsByCategory_(findings, 'duplicate_equipment_id'),
    duplicateLpIds: mdrCountFindingsByCategory_(findings, 'duplicate_lp_id'),
    missingAreaIds: mdrCountFindingsByCategory_(findings, 'missing_area'),
    missingEquipmentReferences: mdrCountFindingsByCategory_(findings, 'missing_equipment_id'),
    missingOilTypeIds: mdrCountFindingsByCategory_(findings, 'missing_oil_type'),
    warningCount: severityCounts.WARNING,
    errorCount: severityCounts.ERROR + severityCounts.BLOCKER,
    blockerCount: severityCounts.BLOCKER,
    infoCount: severityCounts.INFO,
    mappingStats: ctx.mappingStats,
  };
}

/**
 * @param {string} targetId
 * @param {Object} summary
 * @param {Object} ctx
 * @param {Object[]} findings
 */
function mdrWriteDryRunSummary_(targetId, summary, ctx, findings) {
  var ss = SpreadsheetApp.openById(targetId);
  var sheet = mdrReplaceSheet_(ss, MIGRATION_DRY_RUN.SUMMARY_SHEET);
  var rows = [];

  rows.push(['ACC Reliability Platform — Master Data Migration Dry-Run Summary']);
  rows.push(['Sprint', summary.sprint]);
  rows.push(['Generated', summary.generatedAt]);
  rows.push(['Mode', summary.mode]);
  rows.push([]);

  rows.push(['=== VALIDATION SUMMARY ===']);
  rows.push(['Metric', 'Count']);
  rows.push(['Warnings', summary.warningCount]);
  rows.push(['Errors (incl. blockers)', summary.errorCount]);
  rows.push(['Blockers', summary.blockerCount]);
  rows.push(['Duplicate equipment IDs', summary.duplicateEquipmentIds]);
  rows.push(['Duplicate LP IDs', summary.duplicateLpIds]);
  rows.push(['Missing area IDs', summary.missingAreaIds]);
  rows.push(['Missing equipment references', summary.missingEquipmentReferences]);
  rows.push(['Missing oil type IDs', summary.missingOilTypeIds]);
  rows.push(['Total preview rows written', summary.totalPreviewRows]);
  rows.push([]);

  rows.push(['=== SOURCE ROW COUNTS ===']);
  rows.push(['Workbook', 'Sheet', 'Data Rows']);
  for (var s = 0; s < summary.sourceCounts.length; s++) {
    var sc = summary.sourceCounts[s];
    rows.push([sc.workbook, sc.sheet, sc.rowCount]);
  }
  rows.push([]);

  rows.push(['=== PREVIEW ROW COUNTS ===']);
  rows.push(['Preview Sheet', 'Rows Written']);
  var pc = summary.previewCounts;
  rows.push([MIGRATION_DRY_RUN.PREVIEW_SHEETS.EQUIPMENT, pc.Equipment_Master_PREVIEW]);
  rows.push([MIGRATION_DRY_RUN.PREVIEW_SHEETS.LP, pc.LP_Master_PREVIEW]);
  rows.push([MIGRATION_DRY_RUN.PREVIEW_SHEETS.OIL_TYPES, pc.Oil_Types_PREVIEW]);
  rows.push([MIGRATION_DRY_RUN.PREVIEW_SHEETS.OIL_BRANDS, pc.Oil_Brands_PREVIEW]);
  rows.push([MIGRATION_DRY_RUN.PREVIEW_SHEETS.OIL_PRODUCTS, pc.Oil_Products_PREVIEW]);
  rows.push([MIGRATION_DRY_RUN.PREVIEW_SHEETS.LINE_ASSIGNMENTS, pc.Equipment_Line_Assignments_PREVIEW]);
  rows.push([]);

  rows.push(['=== MIGRATION MAPPING STATISTICS ===']);
  rows.push(['Statistic', 'Count']);
  var ms = summary.mappingStats;
  rows.push(['Mapped automatically', ms.mappedAutomatically]);
  rows.push(['Needs mapping', ms.needsMapping]);
  rows.push(['Already valid', ms.alreadyValid]);
  rows.push(['Ignored', ms.ignored]);
  rows.push(['Unknown values', ms.unknownValues]);
  rows.push([]);

  mpAppendFindingSection_(rows, '=== DUPLICATE EQUIPMENT_ID ===',
    findings, 'duplicate_equipment_id');
  mpAppendFindingSection_(rows, '=== DUPLICATE LP_ID ===',
    findings, 'duplicate_lp_id');
  mpAppendFindingSection_(rows, '=== MISSING AREA ===',
    findings, 'missing_area');
  mpAppendFindingSection_(rows, '=== MISSING EQUIPMENT_ID (LP) ===',
    findings, 'missing_equipment_id');
  mpAppendFindingSection_(rows, '=== MISSING OIL TYPE ===',
    findings, 'missing_oil_type');

  if (rows.length > 0) {
    var padded = mpPadRows_(rows, 8);
    sheet.getRange(1, 1, padded.length, 8).setValues(padded);
  }
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 8);
}

// ─── RESOLUTION (no stat tracking) ────────────────────────────────────────────

/**
 * @param {Object} ctx
 * @param {string} legacyValue
 * @param {string} workbook
 * @param {string} sheet
 * @returns {string}
 */
function mdrResolveAreaId_(ctx, legacyValue, workbook, sheet) {
  if (!legacyValue) {
    return '';
  }
  var key = mpNormalizeKey_(legacyValue);
  var direct = ctx.platform.areasByCode[key] || ctx.platform.areasByName[key];
  if (direct) {
    return direct.areaId;
  }
  var mapping = mpPickScopedMapping_(ctx.mappings.area[key], workbook, sheet);
  if (!mapping) {
    return '';
  }
  var areaMeta = ctx.platform.areasById[mpNormalizeKey_(mapping.newAreaId)];
  return areaMeta ? areaMeta.areaId : '';
}

/**
 * @param {Object} ctx
 * @param {string} legacyValue
 * @returns {string}
 */
function mdrResolveEquipmentTypeId_(ctx, legacyValue) {
  if (!legacyValue) {
    return '';
  }
  var key = mpNormalizeKey_(legacyValue);
  var direct = ctx.platform.equipmentTypesByCode[key] || ctx.platform.equipmentTypesById[key];
  if (direct) {
    return direct.typeId;
  }
  var mapping = mpPickActiveMapping_(ctx.mappings.equipmentType[key]);
  if (!mapping) {
    return '';
  }
  var type = ctx.platform.equipmentTypesById[mpNormalizeKey_(mapping.newValue)];
  return type ? type.typeId : '';
}

/**
 * @param {Object} ctx
 * @param {string} legacyValue
 * @returns {string}
 */
function mdrResolveOilTypeId_(ctx, legacyValue) {
  if (!legacyValue) {
    return '';
  }
  var key = mpNormalizeKey_(legacyValue);
  var direct = ctx.platform.oilTypesByCode[key]
    || ctx.platform.oilTypesByName[key]
    || ctx.platform.oilTypesById[key];
  if (direct) {
    return direct.oilTypeId;
  }
  var mapping = mpPickActiveMapping_(ctx.mappings.oilType[key]);
  if (!mapping) {
    return '';
  }
  var oilType = ctx.platform.oilTypesById[mpNormalizeKey_(mapping.newValue)];
  return oilType ? oilType.oilTypeId : '';
}

/**
 * @param {Object} ctx
 * @param {string} legacyValue
 * @returns {string}
 */
function mdrResolveOilBrandId_(ctx, legacyValue) {
  if (!legacyValue) {
    return '';
  }
  var key = mpNormalizeKey_(legacyValue);
  var direct = ctx.platform.oilBrandsByName[key] || ctx.platform.oilBrandsById[key];
  if (direct) {
    return direct.brandId;
  }
  var mapping = mpPickActiveMapping_(ctx.mappings.oilBrand[key]);
  if (!mapping) {
    return '';
  }
  var brand = ctx.platform.oilBrandsById[mpNormalizeKey_(mapping.newValue)];
  return brand ? brand.brandId : '';
}

/**
 * @param {Object} ctx
 * @param {string} legacyValue
 * @returns {string}
 */
function mdrResolveLineValue_(ctx, legacyValue) {
  if (!legacyValue) {
    return '';
  }
  var key = mpNormalizeKey_(legacyValue);
  if (ctx.platform.lines[key]) {
    return ctx.platform.lines[key];
  }
  var mapping = mpPickActiveMapping_(ctx.mappings.line[key]);
  return mapping ? mapping.newValue : '';
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * @param {Object} ctx
 * @param {string} oilTypeName
 * @returns {string}
 */
function mdrLookupBrandForOilType_(ctx, oilTypeName) {
  if (!oilTypeName) {
    return '';
  }
  var key = mpNormalizeKey_(oilTypeName);
  for (var i = 0; i < ctx.lubricantTypes.rows.length; i++) {
    var row = ctx.lubricantTypes.rows[i];
    var name = mpCell_(row, ctx.lubricantTypes.index, 'Name');
    if (mpNormalizeKey_(name) === key) {
      return mpCell_(row, ctx.lubricantTypes.index, 'Brand');
    }
  }
  return '';
}

/**
 * @param {string[]} headers
 * @param {Object} record
 * @returns {Array}
 */
function mdrRow_(headers, record) {
  var row = [];
  for (var i = 0; i < headers.length; i++) {
    var col = headers[i];
    var val = record[col];
    row.push(val === undefined || val === null ? '' : val);
  }
  return row;
}

/**
 * @param {Object[]} findings
 * @param {string} category
 * @returns {number}
 */
function mdrCountFindingsByCategory_(findings, category) {
  var count = 0;
  for (var i = 0; i < findings.length; i++) {
    if (findings[i].category === category) {
      count++;
    }
  }
  return count;
}

/**
 * @param {string} position
 * @returns {string}
 */
function mdrMapLubePointType_(position) {
  var key = mpNormalizeKey_(position);
  if (key.indexOf('GEAR') !== -1) {
    return 'GEARBOX';
  }
  if (key.indexOf('BEAR') !== -1) {
    return 'BEARING';
  }
  if (key.indexOf('HYDR') !== -1) {
    return 'HYDRAULIC';
  }
  if (key.indexOf('COMP') !== -1) {
    return 'COMPRESSOR';
  }
  return 'OTHER';
}

/**
 * @param {*} value
 * @returns {string}
 */
function mdrNormalizeCriticality_(value) {
  var key = mpNormalizeKey_(value);
  if (key === 'HIGH' || key === 'A') {
    return 'A';
  }
  if (key === 'MEDIUM' || key === 'B') {
    return 'B';
  }
  if (key === 'LOW' || key === 'C') {
    return 'C';
  }
  return 'B';
}

/**
 * @param {string} name
 * @returns {string}
 */
function mdrExtractVgGrade_(name) {
  var match = String(name || '').match(/\bVG\s*(\d+)\b/i);
  if (match) {
    return 'VG' + match[1];
  }
  return '';
}

/**
 * @param {string} name
 * @returns {string}
 */
function mdrSlugCode_(name) {
  return String(name || '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
    .slice(0, 20);
}

/**
 * @param {*} value
 * @returns {number|string}
 */
function mdrParseNumber_(value) {
  if (!mpHasValue_(value)) {
    return '';
  }
  var num = Number(value);
  return isNaN(num) ? '' : num;
}

/**
 * @param {*} value
 * @returns {boolean}
 */
function mdrParseBoolean_(value) {
  if (typeof value === 'boolean') {
    return value;
  }
  var key = mpNormalizeKey_(value);
  return key === 'TRUE' || key === 'YES' || key === 'Y' || key === '1';
}

/**
 * @param {number} n
 * @param {number} width
 * @returns {string}
 */
function mdrPad_(n, width) {
  var s = String(n);
  while (s.length < width) {
    s = '0' + s;
  }
  return s;
}

/**
 * @param {string} message
 */
function mdrLog_(message) {
  Logger.log('[MigrationDryRun] ' + message);
}
