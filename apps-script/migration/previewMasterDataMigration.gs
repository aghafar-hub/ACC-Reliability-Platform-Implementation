/**
 * ACC Reliability Platform — Master Data Migration Preview (Sprint 08)
 * File: apps-script/migration/previewMasterDataMigration.gs
 *
 * PREVIEW ONLY — does not migrate data or write to production master sheets.
 * Writes results exclusively to Migration_Preview_Report on the master workbook.
 *
 * Legacy values resolve through configurable mapping sheets (Legacy Mapping Layer)
 * before validation against Platform Master Data.
 *
 * Prerequisites (Script Properties):
 *   MASTER_DATA_SPREADSHEET_ID          — target ACC_PLATFORM_MASTER_DATA workbook
 *   MIGRATION_SOURCE_OPERATIONAL_ID     — legacy ACC_Oil_Operational_Data (Google Sheet)
 *   MIGRATION_SOURCE_USERS_CONFIG_ID    — legacy ACC_Oil_Users_Config
 *   MIGRATION_SOURCE_OIL_ANALYSIS_ID    — legacy ACC OIL Analysis Report - V1
 *   MIGRATION_SOURCE_EQUIPMENT_REGISTER_ID — legacy Equipment Register
 *
 * Run: previewMasterDataMigration()
 */

var MIGRATION_PREVIEW = {
  REPORT_SHEET: 'Migration_Preview_Report',
  SPRINT: '08',
  SEVERITY: {
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
    BLOCKER: 'BLOCKER',
  },
  PROTECTED_SHEETS: [
    'Equipment_Master',
    'LP_Master',
    'Areas',
    'Contractors',
    'Oil_Types',
    'Oil_Brands',
    'Oil_Products',
    'Equipment_Line_Assignments',
  ],
  MAPPING_SHEETS: {
    AREA: 'Legacy_Area_Mapping',
    OIL_TYPE: 'Legacy_Oil_Type_Mapping',
    OIL_BRAND: 'Legacy_Oil_Brand_Mapping',
    EQUIPMENT_TYPE: 'Legacy_Equipment_Type_Mapping',
    CONTRACTOR: 'Legacy_Contractor_Mapping',
    STATUS: 'Legacy_Status_Mapping',
    LINE: 'Legacy_Line_Mapping',
  },
  SOURCE_PROPS: {
    OPERATIONAL: 'MIGRATION_SOURCE_OPERATIONAL_ID',
    USERS_CONFIG: 'MIGRATION_SOURCE_USERS_CONFIG_ID',
    OIL_ANALYSIS: 'MIGRATION_SOURCE_OIL_ANALYSIS_ID',
    EQUIPMENT_REGISTER: 'MIGRATION_SOURCE_EQUIPMENT_REGISTER_ID',
  },
  TARGET_PROP: 'MASTER_DATA_SPREADSHEET_ID',
  LEGACY_SHEETS: {
    LUBRICATION_POINTS: { wb: 'OPERATIONAL', sheet: 'Lubrication Points', headerRow: 1 },
    LUBRICATION_HISTORY: { wb: 'OPERATIONAL', sheet: 'Lubrication History', headerRow: 3 },
    AREAS: { wb: 'USERS_CONFIG', sheet: 'Areas', headerRow: 1 },
    EQUIPMENT: { wb: 'USERS_CONFIG', sheet: 'Equipment', headerRow: 1 },
    LUBRICANT_TYPES: { wb: 'USERS_CONFIG', sheet: 'Lubricant Types', headerRow: 1 },
    EQUIPMENT_REGISTER: { wb: 'EQUIPMENT_REGISTER', sheet: 'EQ Rigester', headerRow: 1 },
    DATA_ENTRY: { wb: 'OIL_ANALYSIS', sheet: 'Data_Entry', headerRow: 5 },
  },
};

/**
 * Main entry — reads legacy source workbooks and writes Migration_Preview_Report.
 * @returns {Object} summary payload (also logged)
 */
function previewMasterDataMigration() {
  var started = new Date();
  mpLog_('=== Master Data Migration Preview START (Sprint ' + MIGRATION_PREVIEW.SPRINT + ') ===');

  var targetId = mpRequireProp_(MIGRATION_PREVIEW.TARGET_PROP);
  logWorkbookGuard_('previewMasterDataMigration', 'MASTER_DATA');
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

  var summary = mpBuildSummary_(context, findings);
  mpWritePreviewReport_(targetId, summary, context, findings);

  var elapsed = Math.round((new Date() - started) / 1000);
  mpLog_('Preview complete in ' + elapsed + 's — candidates=' + summary.importedCandidateCount
    + ' blockers=' + summary.blockerCount + ' errors=' + summary.errorCount
    + ' warnings=' + summary.warningCount);
  mpLog_('Report written to: ' + MIGRATION_PREVIEW.REPORT_SHEET);

  return summary;
}

// ─── CONTEXT & IO ───────────────────────────────────────────────────────────

/**
 * @param {string} targetId
 * @param {Object<string, string>} sourceIds
 * @returns {Object}
 */
function mpBuildContext_(targetId, sourceIds) {
  var ctx = {
    sourceIds: sourceIds,
    sourceCounts: [],
    targetCounts: {},
    areas: [],
    equipment: [],
    lps: [],
    lubricantTypes: [],
    equipmentRegister: [],
    history: [],
    dataEntry: [],
    equipmentTags: {},
    platform: {
      areasById: {},
      areasByCode: {},
      areasByName: {},
      contractorsById: {},
      contractorsByCode: {},
      contractorsByName: {},
      oilTypesById: {},
      oilTypesByCode: {},
      oilTypesByName: {},
      oilBrandsById: {},
      oilBrandsByName: {},
      equipmentTypesById: {},
      equipmentTypesByCode: {},
      statusCodes: {},
      lines: {},
    },
    mappings: {
      area: {},
      oilType: {},
      oilBrand: {},
      equipmentType: {},
      contractor: {},
      status: {},
      line: {},
    },
    mappingStats: mpEmptyMappingStats_(),
    unmappedValues: {},
  };

  mpLoadPlatformMaster_(targetId, ctx);
  mpLoadMappingLayer_(targetId, ctx);

  ctx.areas = mpReadLegacy_(
    sourceIds.USERS_CONFIG, MIGRATION_PREVIEW.LEGACY_SHEETS.AREAS.sheet,
    MIGRATION_PREVIEW.LEGACY_SHEETS.AREAS.headerRow, 'ACC_Oil_Users_Config'
  );
  ctx.equipment = mpReadLegacy_(
    sourceIds.USERS_CONFIG, MIGRATION_PREVIEW.LEGACY_SHEETS.EQUIPMENT.sheet,
    MIGRATION_PREVIEW.LEGACY_SHEETS.EQUIPMENT.headerRow, 'ACC_Oil_Users_Config'
  );
  ctx.lubricantTypes = mpReadLegacy_(
    sourceIds.USERS_CONFIG, MIGRATION_PREVIEW.LEGACY_SHEETS.LUBRICANT_TYPES.sheet,
    MIGRATION_PREVIEW.LEGACY_SHEETS.LUBRICANT_TYPES.headerRow, 'ACC_Oil_Users_Config'
  );
  ctx.lps = mpReadLegacy_(
    sourceIds.OPERATIONAL, MIGRATION_PREVIEW.LEGACY_SHEETS.LUBRICATION_POINTS.sheet,
    MIGRATION_PREVIEW.LEGACY_SHEETS.LUBRICATION_POINTS.headerRow, 'ACC_Oil_Operational_Data'
  );
  ctx.history = mpReadLegacy_(
    sourceIds.OPERATIONAL, MIGRATION_PREVIEW.LEGACY_SHEETS.LUBRICATION_HISTORY.sheet,
    MIGRATION_PREVIEW.LEGACY_SHEETS.LUBRICATION_HISTORY.headerRow, 'ACC_Oil_Operational_Data'
  );
  ctx.equipmentRegister = mpReadLegacy_(
    sourceIds.EQUIPMENT_REGISTER, MIGRATION_PREVIEW.LEGACY_SHEETS.EQUIPMENT_REGISTER.sheet,
    MIGRATION_PREVIEW.LEGACY_SHEETS.EQUIPMENT_REGISTER.headerRow, 'Equipment Register'
  );
  ctx.dataEntry = mpReadLegacy_(
    sourceIds.OIL_ANALYSIS, MIGRATION_PREVIEW.LEGACY_SHEETS.DATA_ENTRY.sheet,
    MIGRATION_PREVIEW.LEGACY_SHEETS.DATA_ENTRY.headerRow, 'ACC OIL Analysis Report - V1'
  );

  for (var e = 0; e < ctx.equipment.rows.length; e++) {
    var eqTag = mpCell_(ctx.equipment.rows[e], ctx.equipment.index, 'Equipment Code');
    if (eqTag) {
      ctx.equipmentTags[mpNormalizeKey_(eqTag)] = true;
    }
  }

  ctx.targetCounts = {
    Areas: mpCountDataRows_(ctx.areas),
    Contractors: mpUniqueLegacyContractors_(ctx.areas).length,
    Equipment_Master: mpCountDataRows_(ctx.equipment),
    LP_Master: mpCountDataRows_(ctx.lps),
    Oil_Types: mpCountDataRows_(ctx.lubricantTypes),
    Oil_Brands: mpUniqueBrands_(ctx.lubricantTypes).length,
    Oil_Products: mpEstimateOilProducts_(ctx.lubricantTypes),
    Equipment_Line_Assignments: mpCountDataRows_(ctx.equipmentRegister),
  };

  return ctx;
}

/**
 * @param {string} targetId
 * @param {Object} ctx
 */
function mpLoadPlatformMaster_(targetId, ctx) {
  var areas = mpReadTargetSheet_(targetId, 'Areas');
  for (var a = 0; a < areas.rows.length; a++) {
    var row = areas.rows[a];
    var meta = {
      areaId: mpCell_(row, areas.index, 'area_id'),
      areaCode: mpCell_(row, areas.index, 'area_code'),
      areaName: mpCell_(row, areas.index, 'area_name'),
      responsibleContractorId: mpCell_(row, areas.index, 'responsible_contractor_id'),
      line: mpCell_(row, areas.index, 'line'),
    };
    if (meta.areaId) {
      ctx.platform.areasById[mpNormalizeKey_(meta.areaId)] = meta;
    }
    if (meta.areaCode) {
      ctx.platform.areasByCode[mpNormalizeKey_(meta.areaCode)] = meta;
    }
    if (meta.areaName) {
      ctx.platform.areasByName[mpNormalizeKey_(meta.areaName)] = meta;
    }
    if (meta.line) {
      ctx.platform.lines[mpNormalizeKey_(meta.line)] = meta.line;
    }
  }

  var contractors = mpReadTargetSheet_(targetId, 'Contractors');
  for (var c = 0; c < contractors.rows.length; c++) {
    var cRow = contractors.rows[c];
    var cMeta = {
      contractorId: mpCell_(cRow, contractors.index, 'contractor_id'),
      contractorCode: mpCell_(cRow, contractors.index, 'contractor_code'),
      contractorName: mpCell_(cRow, contractors.index, 'contractor_name'),
    };
    if (cMeta.contractorId) {
      ctx.platform.contractorsById[mpNormalizeKey_(cMeta.contractorId)] = cMeta;
    }
    if (cMeta.contractorCode) {
      ctx.platform.contractorsByCode[mpNormalizeKey_(cMeta.contractorCode)] = cMeta;
    }
    if (cMeta.contractorName) {
      ctx.platform.contractorsByName[mpNormalizeKey_(cMeta.contractorName)] = cMeta;
    }
  }

  var oilTypes = mpReadTargetSheet_(targetId, 'Oil_Types');
  for (var o = 0; o < oilTypes.rows.length; o++) {
    var oRow = oilTypes.rows[o];
    var oMeta = {
      oilTypeId: mpCell_(oRow, oilTypes.index, 'oil_type_id'),
      typeCode: mpCell_(oRow, oilTypes.index, 'type_code'),
      typeName: mpCell_(oRow, oilTypes.index, 'type_name'),
    };
    if (oMeta.oilTypeId) {
      ctx.platform.oilTypesById[mpNormalizeKey_(oMeta.oilTypeId)] = oMeta;
    }
    if (oMeta.typeCode) {
      ctx.platform.oilTypesByCode[mpNormalizeKey_(oMeta.typeCode)] = oMeta;
    }
    if (oMeta.typeName) {
      ctx.platform.oilTypesByName[mpNormalizeKey_(oMeta.typeName)] = oMeta;
    }
  }

  var oilBrands = mpReadTargetSheet_(targetId, 'Oil_Brands');
  for (var b = 0; b < oilBrands.rows.length; b++) {
    var bRow = oilBrands.rows[b];
    var bMeta = {
      brandId: mpCell_(bRow, oilBrands.index, 'brand_id'),
      brandName: mpCell_(bRow, oilBrands.index, 'brand_name'),
    };
    if (bMeta.brandId) {
      ctx.platform.oilBrandsById[mpNormalizeKey_(bMeta.brandId)] = bMeta;
    }
    if (bMeta.brandName) {
      ctx.platform.oilBrandsByName[mpNormalizeKey_(bMeta.brandName)] = bMeta;
    }
  }

  var eqTypes = mpReadTargetSheet_(targetId, 'Equipment_Types');
  for (var t = 0; t < eqTypes.rows.length; t++) {
    var tRow = eqTypes.rows[t];
    var tMeta = {
      typeId: mpCell_(tRow, eqTypes.index, 'type_id'),
      typeCode: mpCell_(tRow, eqTypes.index, 'type_code'),
      typeName: mpCell_(tRow, eqTypes.index, 'type_name'),
    };
    if (tMeta.typeId) {
      ctx.platform.equipmentTypesById[mpNormalizeKey_(tMeta.typeId)] = tMeta;
    }
    if (tMeta.typeCode) {
      ctx.platform.equipmentTypesByCode[mpNormalizeKey_(tMeta.typeCode)] = tMeta;
    }
  }

  var statuses = mpReadTargetSheet_(targetId, 'Status_Dictionary');
  for (var s = 0; s < statuses.rows.length; s++) {
    var sRow = statuses.rows[s];
    var code = mpCell_(sRow, statuses.index, 'status_code');
    if (code) {
      ctx.platform.statusCodes[mpNormalizeKey_(code)] = code;
    }
  }
}

/**
 * @param {string} targetId
 * @param {Object} ctx
 */
function mpLoadMappingLayer_(targetId, ctx) {
  mpLoadSimpleMappings_(targetId, MIGRATION_PREVIEW.MAPPING_SHEETS.OIL_TYPE,
    ctx.mappings.oilType, 'oilType');
  mpLoadSimpleMappings_(targetId, MIGRATION_PREVIEW.MAPPING_SHEETS.OIL_BRAND,
    ctx.mappings.oilBrand, 'oilBrand');
  mpLoadSimpleMappings_(targetId, MIGRATION_PREVIEW.MAPPING_SHEETS.EQUIPMENT_TYPE,
    ctx.mappings.equipmentType, 'equipmentType');
  mpLoadSimpleMappings_(targetId, MIGRATION_PREVIEW.MAPPING_SHEETS.CONTRACTOR,
    ctx.mappings.contractor, 'contractor');
  mpLoadSimpleMappings_(targetId, MIGRATION_PREVIEW.MAPPING_SHEETS.STATUS,
    ctx.mappings.status, 'status');
  mpLoadSimpleMappings_(targetId, MIGRATION_PREVIEW.MAPPING_SHEETS.LINE,
    ctx.mappings.line, 'line');

  var areaSheet = mpReadTargetSheet_(targetId, MIGRATION_PREVIEW.MAPPING_SHEETS.AREA);
  for (var i = 0; i < areaSheet.rows.length; i++) {
    var row = areaSheet.rows[i];
    var legacyValue = mpCell_(row, areaSheet.index, 'legacy_value');
    if (!legacyValue) {
      continue;
    }
    var key = mpNormalizeKey_(legacyValue);
    if (!ctx.mappings.area[key]) {
      ctx.mappings.area[key] = [];
    }
    ctx.mappings.area[key].push({
      mappingId: mpCell_(row, areaSheet.index, 'mapping_id'),
      legacyValue: legacyValue,
      legacyWorkbook: mpCell_(row, areaSheet.index, 'legacy_workbook'),
      legacySheet: mpCell_(row, areaSheet.index, 'legacy_sheet'),
      newAreaId: mpCell_(row, areaSheet.index, 'new_area_id'),
      newAreaCode: mpCell_(row, areaSheet.index, 'new_area_code'),
      newAreaName: mpCell_(row, areaSheet.index, 'new_area_name'),
      responsibleContractorId: mpCell_(row, areaSheet.index, 'responsible_contractor_id'),
      status: mpCell_(row, areaSheet.index, 'status') || 'ACTIVE',
    });
  }
}

/**
 * @param {string} targetId
 * @param {string} sheetName
 * @param {Object} store
 * @param {string} category
 */
function mpLoadSimpleMappings_(targetId, sheetName, store, category) {
  var sheet = mpReadTargetSheet_(targetId, sheetName);
  for (var i = 0; i < sheet.rows.length; i++) {
    var row = sheet.rows[i];
    var legacyValue = mpCell_(row, sheet.index, 'legacy_value');
    if (!legacyValue) {
      continue;
    }
    var key = mpNormalizeKey_(legacyValue);
    if (!store[key]) {
      store[key] = [];
    }
    store[key].push({
      mappingId: mpCell_(row, sheet.index, 'mapping_id'),
      legacyValue: legacyValue,
      newValue: mpCell_(row, sheet.index, 'new_value'),
      status: mpCell_(row, sheet.index, 'status') || 'ACTIVE',
      category: category,
    });
  }
}

/**
 * @param {string} spreadsheetId
 * @param {string} sheetName
 * @returns {{ headers: string[], index: Object, rows: Object[] }}
 */
function mpReadTargetSheet_(spreadsheetId, sheetName) {
  return mpReadLegacy_(spreadsheetId, sheetName, 1, 'ACC_PLATFORM_MASTER_DATA');
}

/**
 * @param {string} spreadsheetId
 * @param {string} sheetName
 * @param {number} headerRow
 * @param {string} workbookLabel
 * @returns {{ workbook: string, sheet: string, headerRow: number, headers: string[], index: Object, rows: Object[] }}
 */
function mpReadLegacy_(spreadsheetId, sheetName, headerRow, workbookLabel) {
  var empty = {
    workbook: workbookLabel,
    sheet: sheetName,
    headerRow: headerRow,
    headers: [],
    index: {},
    rows: [],
  };

  if (!spreadsheetId) {
    return empty;
  }

  try {
    var ss = SpreadsheetApp.openById(spreadsheetId);
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      mpLog_('WARN: Sheet not found — ' + workbookLabel + ' / ' + sheetName);
      return empty;
    }

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < headerRow || lastCol < 1) {
      return empty;
    }

    var headerValues = sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0];
    var headers = [];
    for (var h = 0; h < headerValues.length; h++) {
      headers.push(mpNormalizeHeader_(headerValues[h]));
    }

    var index = {};
    for (var i = 0; i < headers.length; i++) {
      if (headers[i]) {
        index[headers[i]] = i;
      }
    }

    var dataStart = headerRow + 1;
    if (lastRow < dataStart) {
      return {
        workbook: workbookLabel,
        sheet: sheetName,
        headerRow: headerRow,
        headers: headers,
        index: index,
        rows: [],
      };
    }

    var values = sheet.getRange(dataStart, 1, lastRow - headerRow, lastCol).getValues();
    var rows = [];
    for (var r = 0; r < values.length; r++) {
      var rowObj = { _sourceRow: dataStart + r, _values: values[r] };
      var hasData = false;
      for (var c = 0; c < values[r].length; c++) {
        if (mpHasValue_(values[r][c])) {
          hasData = true;
          break;
        }
      }
      if (hasData) {
        rows.push(rowObj);
      }
    }

    return {
      workbook: workbookLabel,
      sheet: sheetName,
      headerRow: headerRow,
      headers: headers,
      index: index,
      rows: rows,
    };
  } catch (err) {
    mpLog_('ERROR reading ' + workbookLabel + '/' + sheetName + ': ' + err.message);
    return empty;
  }
}

// ─── MAPPING RESOLUTION ───────────────────────────────────────────────────────

/**
 * @returns {Object}
 */
function mpEmptyMappingStats_() {
  return {
    mappedAutomatically: 0,
    needsMapping: 0,
    alreadyValid: 0,
    ignored: 0,
    unknownValues: 0,
  };
}

/**
 * @param {Object} ctx
 * @param {string} resolution
 */
function mpTrackMappingStat_(ctx, resolution) {
  if (resolution === 'mapped') {
    ctx.mappingStats.mappedAutomatically++;
  } else if (resolution === 'already_valid') {
    ctx.mappingStats.alreadyValid++;
  } else if (resolution === 'unmapped') {
    ctx.mappingStats.needsMapping++;
  } else if (resolution === 'ignored') {
    ctx.mappingStats.ignored++;
  } else if (resolution === 'invalid_destination') {
    ctx.mappingStats.unknownValues++;
  }
}

/**
 * @param {Object} ctx
 * @param {string} category
 * @param {string} legacyValue
 * @param {string} suggestedDestination
 * @param {string} severity
 */
function mpTrackUnmapped_(ctx, category, legacyValue, suggestedDestination, severity) {
  if (!legacyValue) {
    return;
  }
  var key = category + '|' + mpNormalizeKey_(legacyValue);
  if (!ctx.unmappedValues[key]) {
    ctx.unmappedValues[key] = {
      category: category,
      legacyValue: legacyValue,
      occurrences: 0,
      suggestedDestination: suggestedDestination || '',
      severity: severity,
    };
  }
  ctx.unmappedValues[key].occurrences++;
}

/**
 * @param {Array} entries
 * @param {string} workbook
 * @param {string} sheet
 * @returns {Object|null}
 */
function mpPickScopedMapping_(entries, workbook, sheet) {
  if (!entries || entries.length === 0) {
    return null;
  }
  var scoped = null;
  var generic = null;
  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    if (mpNormalizeKey_(entry.status) === 'INACTIVE') {
      continue;
    }
    var wbMatch = !entry.legacyWorkbook
      || mpNormalizeKey_(entry.legacyWorkbook) === mpNormalizeKey_(workbook);
    var shMatch = !entry.legacySheet
      || mpNormalizeKey_(entry.legacySheet) === mpNormalizeKey_(sheet);
    if (wbMatch && shMatch) {
      if (entry.legacyWorkbook && entry.legacySheet) {
        return entry;
      }
      if (entry.legacyWorkbook || entry.legacySheet) {
        scoped = entry;
      } else {
        generic = entry;
      }
    }
  }
  return scoped || generic;
}

/**
 * @param {Array} entries
 * @returns {Object|null}
 */
function mpPickActiveMapping_(entries) {
  if (!entries || entries.length === 0) {
    return null;
  }
  for (var i = 0; i < entries.length; i++) {
    if (mpNormalizeKey_(entries[i].status) !== 'INACTIVE') {
      return entries[i];
    }
  }
  return null;
}

/**
 * @param {Object} ctx
 * @param {string} legacyValue
 * @param {string} workbook
 * @param {string} sheet
 * @returns {{ resolution: string, areaMeta: Object|null, mappingId: string, suggestedDestination: string }}
 */
function mpResolveArea_(ctx, legacyValue, workbook, sheet) {
  if (!legacyValue) {
    return { resolution: 'unmapped', areaMeta: null, mappingId: '', suggestedDestination: '' };
  }

  var key = mpNormalizeKey_(legacyValue);
  var direct = ctx.platform.areasByCode[key] || ctx.platform.areasByName[key];
  if (direct) {
    mpTrackMappingStat_(ctx, 'already_valid');
    return {
      resolution: 'already_valid',
      areaMeta: direct,
      mappingId: '',
      suggestedDestination: direct.areaId,
    };
  }

  var mapping = mpPickScopedMapping_(ctx.mappings.area[key], workbook, sheet);
  if (!mapping) {
    mpTrackMappingStat_(ctx, 'unmapped');
    mpTrackUnmapped_(ctx, 'Area', legacyValue, '', MIGRATION_PREVIEW.SEVERITY.ERROR);
    return { resolution: 'unmapped', areaMeta: null, mappingId: '', suggestedDestination: '' };
  }

  var areaMeta = ctx.platform.areasById[mpNormalizeKey_(mapping.newAreaId)];
  if (!areaMeta) {
    mpTrackMappingStat_(ctx, 'invalid_destination');
    mpTrackUnmapped_(ctx, 'Area', legacyValue, mapping.newAreaId, MIGRATION_PREVIEW.SEVERITY.ERROR);
    return {
      resolution: 'invalid_destination',
      areaMeta: null,
      mappingId: mapping.mappingId,
      suggestedDestination: mapping.newAreaId,
    };
  }

  mpTrackMappingStat_(ctx, 'mapped');
  return {
    resolution: 'mapped',
    areaMeta: areaMeta,
    mappingId: mapping.mappingId,
    suggestedDestination: areaMeta.areaId,
  };
}

/**
 * @param {Object} ctx
 * @param {string} legacyValue
 * @returns {{ resolution: string, contractorId: string, mappingId: string }}
 */
function mpResolveContractor_(ctx, legacyValue) {
  if (!legacyValue) {
    return { resolution: 'unmapped', contractorId: '', mappingId: '' };
  }

  var key = mpNormalizeKey_(legacyValue);
  var direct = ctx.platform.contractorsByCode[key] || ctx.platform.contractorsByName[key];
  if (direct) {
    mpTrackMappingStat_(ctx, 'already_valid');
    return { resolution: 'already_valid', contractorId: direct.contractorId, mappingId: '' };
  }

  var mapping = mpPickActiveMapping_(ctx.mappings.contractor[key]);
  if (!mapping) {
    mpTrackMappingStat_(ctx, 'unmapped');
    mpTrackUnmapped_(ctx, 'Contractor', legacyValue, '', MIGRATION_PREVIEW.SEVERITY.ERROR);
    return { resolution: 'unmapped', contractorId: '', mappingId: '' };
  }

  var contractor = ctx.platform.contractorsById[mpNormalizeKey_(mapping.newValue)];
  if (!contractor) {
    mpTrackMappingStat_(ctx, 'invalid_destination');
    mpTrackUnmapped_(ctx, 'Contractor', legacyValue, mapping.newValue, MIGRATION_PREVIEW.SEVERITY.ERROR);
    return { resolution: 'invalid_destination', contractorId: '', mappingId: mapping.mappingId };
  }

  mpTrackMappingStat_(ctx, 'mapped');
  return { resolution: 'mapped', contractorId: contractor.contractorId, mappingId: mapping.mappingId };
}

/**
 * @param {Object} ctx
 * @param {string} legacyValue
 * @returns {{ resolution: string, oilTypeId: string, mappingId: string }}
 */
function mpResolveOilType_(ctx, legacyValue) {
  if (!legacyValue) {
    return { resolution: 'unmapped', oilTypeId: '', mappingId: '' };
  }

  var key = mpNormalizeKey_(legacyValue);
  var direct = ctx.platform.oilTypesByCode[key]
    || ctx.platform.oilTypesByName[key]
    || ctx.platform.oilTypesById[key];
  if (direct) {
    mpTrackMappingStat_(ctx, 'already_valid');
    return { resolution: 'already_valid', oilTypeId: direct.oilTypeId, mappingId: '' };
  }

  var mapping = mpPickActiveMapping_(ctx.mappings.oilType[key]);
  if (!mapping) {
    mpTrackMappingStat_(ctx, 'unmapped');
    mpTrackUnmapped_(ctx, 'Oil Type', legacyValue, '', MIGRATION_PREVIEW.SEVERITY.ERROR);
    return { resolution: 'unmapped', oilTypeId: '', mappingId: '' };
  }

  var oilType = ctx.platform.oilTypesById[mpNormalizeKey_(mapping.newValue)];
  if (!oilType) {
    mpTrackMappingStat_(ctx, 'invalid_destination');
    mpTrackUnmapped_(ctx, 'Oil Type', legacyValue, mapping.newValue, MIGRATION_PREVIEW.SEVERITY.ERROR);
    return { resolution: 'invalid_destination', oilTypeId: '', mappingId: mapping.mappingId };
  }

  mpTrackMappingStat_(ctx, 'mapped');
  return { resolution: 'mapped', oilTypeId: oilType.oilTypeId, mappingId: mapping.mappingId };
}

/**
 * @param {Object} ctx
 * @param {string} legacyValue
 * @returns {{ resolution: string, brandId: string, mappingId: string }}
 */
function mpResolveOilBrand_(ctx, legacyValue) {
  if (!legacyValue) {
    return { resolution: 'unmapped', brandId: '', mappingId: '' };
  }

  var key = mpNormalizeKey_(legacyValue);
  var direct = ctx.platform.oilBrandsByName[key]
    || ctx.platform.oilBrandsById[key];
  if (direct) {
    mpTrackMappingStat_(ctx, 'already_valid');
    return { resolution: 'already_valid', brandId: direct.brandId, mappingId: '' };
  }

  var mapping = mpPickActiveMapping_(ctx.mappings.oilBrand[key]);
  if (!mapping) {
    mpTrackMappingStat_(ctx, 'unmapped');
    mpTrackUnmapped_(ctx, 'Oil Brand', legacyValue, '', MIGRATION_PREVIEW.SEVERITY.ERROR);
    return { resolution: 'unmapped', brandId: '', mappingId: '' };
  }

  var brand = ctx.platform.oilBrandsById[mpNormalizeKey_(mapping.newValue)];
  if (!brand) {
    mpTrackMappingStat_(ctx, 'invalid_destination');
    mpTrackUnmapped_(ctx, 'Oil Brand', legacyValue, mapping.newValue, MIGRATION_PREVIEW.SEVERITY.ERROR);
    return { resolution: 'invalid_destination', brandId: '', mappingId: mapping.mappingId };
  }

  mpTrackMappingStat_(ctx, 'mapped');
  return { resolution: 'mapped', brandId: brand.brandId, mappingId: mapping.mappingId };
}

/**
 * @param {Object} ctx
 * @param {string} legacyValue
 * @returns {{ resolution: string, line: string, mappingId: string }}
 */
function mpResolveLine_(ctx, legacyValue) {
  if (!legacyValue) {
    return { resolution: 'unmapped', line: '', mappingId: '' };
  }

  var key = mpNormalizeKey_(legacyValue);
  if (ctx.platform.lines[key]) {
    mpTrackMappingStat_(ctx, 'already_valid');
    return { resolution: 'already_valid', line: ctx.platform.lines[key], mappingId: '' };
  }

  var mapping = mpPickActiveMapping_(ctx.mappings.line[key]);
  if (!mapping) {
    mpTrackMappingStat_(ctx, 'unmapped');
    mpTrackUnmapped_(ctx, 'Production Line', legacyValue, '', MIGRATION_PREVIEW.SEVERITY.ERROR);
    return { resolution: 'unmapped', line: '', mappingId: '' };
  }

  mpTrackMappingStat_(ctx, 'mapped');
  return { resolution: 'mapped', line: mapping.newValue, mappingId: mapping.mappingId };
}

// ─── VALIDATION COLLECTORS ────────────────────────────────────────────────────

/**
 * @param {Object} ctx
 * @param {Object[]} findings
 */
function mpCollectSourceCounts_(ctx, findings) {
  var sources = [
    ctx.areas,
    ctx.equipment,
    ctx.lubricantTypes,
    ctx.lps,
    ctx.history,
    ctx.equipmentRegister,
    ctx.dataEntry,
  ];

  for (var i = 0; i < sources.length; i++) {
    var src = sources[i];
    ctx.sourceCounts.push({
      workbook: src.workbook,
      sheet: src.sheet,
      rowCount: src.rows.length,
    });
    mpAddFinding_(findings, MIGRATION_PREVIEW.SEVERITY.INFO, 'SRC-COUNT', 'source_row_count',
      src.workbook, src.sheet, '', '', 'Data rows: ' + src.rows.length);
  }
}

/**
 * Validates ACTIVE mapping rows point to existing platform master records.
 * @param {Object} ctx
 * @param {Object[]} findings
 */
function mpValidateMappingDefinitions_(ctx, findings) {
  for (var key in ctx.mappings.area) {
    var areaMaps = ctx.mappings.area[key];
    for (var a = 0; a < areaMaps.length; a++) {
      var am = areaMaps[a];
      if (mpNormalizeKey_(am.status) === 'INACTIVE' || !am.newAreaId) {
        continue;
      }
      if (!ctx.platform.areasById[mpNormalizeKey_(am.newAreaId)]) {
        mpAddFinding_(findings, MIGRATION_PREVIEW.SEVERITY.ERROR, 'V-MAP-002',
          'invalid_mapping_destination', MIGRATION_PREVIEW.MAPPING_SHEETS.AREA, '',
          'new_area_id', am.newAreaId,
          'Mapping ' + am.mappingId + ' points to missing Areas row');
      }
    }
  }

  mpValidateSimpleMappingDestinations_(ctx, findings, ctx.mappings.contractor,
    'Contractors', MIGRATION_PREVIEW.MAPPING_SHEETS.CONTRACTOR, ctx.platform.contractorsById);
  mpValidateSimpleMappingDestinations_(ctx, findings, ctx.mappings.oilType,
    'Oil_Types', MIGRATION_PREVIEW.MAPPING_SHEETS.OIL_TYPE, ctx.platform.oilTypesById);
  mpValidateSimpleMappingDestinations_(ctx, findings, ctx.mappings.oilBrand,
    'Oil_Brands', MIGRATION_PREVIEW.MAPPING_SHEETS.OIL_BRAND, ctx.platform.oilBrandsById);
  mpValidateSimpleMappingDestinations_(ctx, findings, ctx.mappings.equipmentType,
    'Equipment_Types', MIGRATION_PREVIEW.MAPPING_SHEETS.EQUIPMENT_TYPE, ctx.platform.equipmentTypesById);
}

/**
 * @param {Object} ctx
 * @param {Object[]} findings
 * @param {Object} store
 * @param {string} targetLabel
 * @param {string} sheetName
 * @param {Object} targetById
 */
function mpValidateSimpleMappingDestinations_(ctx, findings, store, targetLabel, sheetName, targetById) {
  for (var key in store) {
    var entries = store[key];
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      if (mpNormalizeKey_(entry.status) === 'INACTIVE' || !entry.newValue) {
        continue;
      }
      if (!targetById[mpNormalizeKey_(entry.newValue)]) {
        mpAddFinding_(findings, MIGRATION_PREVIEW.SEVERITY.ERROR, 'V-MAP-002',
          'invalid_mapping_destination', sheetName, '',
          'new_value', entry.newValue,
          'Mapping ' + entry.mappingId + ' points to missing ' + targetLabel + ' row');
      }
    }
  }
}

/**
 * @param {Object} ctx
 * @param {Object[]} findings
 */
function mpValidateAreas_(ctx, findings) {
  var seenCodes = {};

  for (var i = 0; i < ctx.areas.rows.length; i++) {
    var row = ctx.areas.rows[i];
    var code = mpCell_(row, ctx.areas.index, 'Location Code');
    var name = mpCell_(row, ctx.areas.index, 'Area Name');
    var contractor = mpCell_(row, ctx.areas.index, 'Contractor');
    var src = ctx.areas.workbook + ' / ' + ctx.areas.sheet;
    var rowNum = row._sourceRow;

    if (!code && !name) {
      continue;
    }

    if (!contractor) {
      mpAddFinding_(findings, MIGRATION_PREVIEW.SEVERITY.ERROR, 'V-AREA-001',
        'missing_responsible_contractor_id', src, rowNum, 'Contractor', '',
        'Area must have one responsible contractor (no shared areas)');
    } else {
      var contractorRes = mpResolveContractor_(ctx, contractor);
      if (contractorRes.resolution === 'unmapped') {
        mpAddFinding_(findings, MIGRATION_PREVIEW.SEVERITY.ERROR, 'V-MAP-001',
          'unmapped_legacy_value', src, rowNum, 'Contractor', contractor,
          'No Legacy_Contractor_Mapping for contractor value');
      } else if (contractorRes.resolution === 'invalid_destination') {
        mpAddFinding_(findings, MIGRATION_PREVIEW.SEVERITY.ERROR, 'V-MAP-002',
          'invalid_mapping_destination', src, rowNum, 'Contractor', contractor,
          'Contractor mapping points to missing Contractors row');
      }
    }

    if (code) {
      var dupKey = mpNormalizeKey_(code);
      if (seenCodes[dupKey]) {
        mpAddFinding_(findings, MIGRATION_PREVIEW.SEVERITY.ERROR, 'V-AREA-DUP',
          'duplicate_area_code', src, rowNum, 'Location Code', code,
          'Duplicate area code (first at row ' + seenCodes[dupKey] + ')');
      } else {
        seenCodes[dupKey] = rowNum;
      }
    }
  }
}

/**
 * @param {Object} ctx
 * @param {Object[]} findings
 */
function mpValidateEquipment_(ctx, findings) {
  var tagCounts = {};
  var tagFirstRow = {};

  for (var i = 0; i < ctx.equipment.rows.length; i++) {
    var row = ctx.equipment.rows[i];
    var tag = mpCell_(row, ctx.equipment.index, 'Equipment Code');
    var areaVal = mpCell_(row, ctx.equipment.index, 'Area');
    var contractor = mpCell_(row, ctx.equipment.index, 'Contractor');
    var eqType = mpCell_(row, ctx.equipment.index, 'Equipment Type');
    var src = ctx.equipment.workbook + ' / ' + ctx.equipment.sheet;
    var rowNum = row._sourceRow;

    if (!tag) {
      continue;
    }

    var tagKey = mpNormalizeKey_(tag);
    tagCounts[tagKey] = (tagCounts[tagKey] || 0) + 1;
    if (!tagFirstRow[tagKey]) {
      tagFirstRow[tagKey] = rowNum;
    }

    if (!areaVal) {
      mpAddFinding_(findings, MIGRATION_PREVIEW.SEVERITY.ERROR, 'V-AREA-002',
        'missing_area', src, rowNum, 'Area', '',
        'Equipment must reference an area');
    } else {
      var areaRes = mpResolveArea_(ctx, areaVal, ctx.equipment.workbook, ctx.equipment.sheet);
      if (areaRes.resolution === 'unmapped') {
        mpAddFinding_(findings, MIGRATION_PREVIEW.SEVERITY.ERROR, 'V-MAP-001',
          'unmapped_legacy_value', src, rowNum, 'Area', areaVal,
          'No Legacy_Area_Mapping for area value');
      } else if (areaRes.resolution === 'invalid_destination') {
        mpAddFinding_(findings, MIGRATION_PREVIEW.SEVERITY.ERROR, 'V-MAP-002',
          'invalid_mapping_destination', src, rowNum, 'Area', areaVal,
          'Area mapping points to missing Areas row');
      } else {
        var areaMeta = areaRes.areaMeta;
        if (contractor) {
          var contractorRes = mpResolveContractor_(ctx, contractor);
          if (contractorRes.resolution === 'unmapped') {
            mpAddFinding_(findings, MIGRATION_PREVIEW.SEVERITY.ERROR, 'V-MAP-001',
              'unmapped_legacy_value', src, rowNum, 'Contractor', contractor,
              'No Legacy_Contractor_Mapping for contractor value');
          } else if (contractorRes.resolution === 'invalid_destination') {
            mpAddFinding_(findings, MIGRATION_PREVIEW.SEVERITY.ERROR, 'V-MAP-002',
              'invalid_mapping_destination', src, rowNum, 'Contractor', contractor,
              'Contractor mapping points to missing Contractors row');
          } else if (areaMeta.responsibleContractorId
            && contractorRes.contractorId
            && mpNormalizeKey_(contractorRes.contractorId)
              !== mpNormalizeKey_(areaMeta.responsibleContractorId)) {
            mpAddFinding_(findings, MIGRATION_PREVIEW.SEVERITY.WARNING, 'V-AREA-003',
              'equipment_area_contractor_mismatch', src, rowNum, 'Contractor', contractor,
              'Equipment contractor "' + contractor + '" ≠ area contractor "'
                + areaMeta.responsibleContractorId + '" (area ' + areaMeta.areaCode + ')');
          }
        } else if (!areaMeta.responsibleContractorId) {
          mpAddFinding_(findings, MIGRATION_PREVIEW.SEVERITY.ERROR, 'V-AREA-001',
            'missing_responsible_contractor_id', src, rowNum, 'Area→Contractor', areaVal,
            'Resolved area has no responsible contractor');
        }
      }
    }

    if (eqType) {
      mpResolveEquipmentType_(ctx, eqType, src, rowNum, findings);
    }
  }

  for (var key in tagCounts) {
    if (tagCounts[key] > 1) {
      mpAddFinding_(findings, MIGRATION_PREVIEW.SEVERITY.ERROR, 'V-EQP-DUP',
        'duplicate_equipment_id', ctx.equipment.workbook + ' / ' + ctx.equipment.sheet,
        tagFirstRow[key], 'Equipment Code', key,
        'Duplicate equipment tag — ' + tagCounts[key] + ' rows (Equipment_Master requires unique equipment_tag)');
    }
  }
}

/**
 * @param {Object} ctx
 * @param {string} legacyValue
 * @param {string} src
 * @param {number} rowNum
 * @param {Object[]} findings
 */
function mpResolveEquipmentType_(ctx, legacyValue, src, rowNum, findings) {
  var key = mpNormalizeKey_(legacyValue);
  var direct = ctx.platform.equipmentTypesByCode[key]
    || ctx.platform.equipmentTypesById[key];
  if (direct) {
    mpTrackMappingStat_(ctx, 'already_valid');
    return;
  }

  var mapping = mpPickActiveMapping_(ctx.mappings.equipmentType[key]);
  if (!mapping) {
    mpTrackMappingStat_(ctx, 'unmapped');
    mpTrackUnmapped_(ctx, 'Equipment Type', legacyValue, '', MIGRATION_PREVIEW.SEVERITY.ERROR);
    mpAddFinding_(findings, MIGRATION_PREVIEW.SEVERITY.ERROR, 'V-MAP-001',
      'unmapped_legacy_value', src, rowNum, 'Equipment Type', legacyValue,
      'No Legacy_Equipment_Type_Mapping for equipment type');
    return;
  }

  if (!ctx.platform.equipmentTypesById[mpNormalizeKey_(mapping.newValue)]) {
    mpTrackMappingStat_(ctx, 'invalid_destination');
    mpTrackUnmapped_(ctx, 'Equipment Type', legacyValue, mapping.newValue, MIGRATION_PREVIEW.SEVERITY.ERROR);
    mpAddFinding_(findings, MIGRATION_PREVIEW.SEVERITY.ERROR, 'V-MAP-002',
      'invalid_mapping_destination', src, rowNum, 'Equipment Type', legacyValue,
      'Equipment type mapping points to missing Equipment_Types row');
    return;
  }

  mpTrackMappingStat_(ctx, 'mapped');
}

/**
 * @param {Object} ctx
 * @param {Object[]} findings
 */
function mpValidateLubricationPoints_(ctx, findings) {
  var lpCounts = {};
  var lpFirstRow = {};

  for (var i = 0; i < ctx.lps.rows.length; i++) {
    var row = ctx.lps.rows[i];
    var lpId = mpCell_(row, ctx.lps.index, 'LP ID');
    var equipCode = mpCell_(row, ctx.lps.index, 'Equipment Code');
    var areaVal = mpCell_(row, ctx.lps.index, 'Area');
    var contractor = mpCell_(row, ctx.lps.index, 'Contractor');
    var oilType = mpCell_(row, ctx.lps.index, 'Lubricant Type');
    var src = ctx.lps.workbook + ' / ' + ctx.lps.sheet;
    var rowNum = row._sourceRow;

    if (!lpId) {
      continue;
    }

    var lpKey = mpNormalizeKey_(lpId);
    lpCounts[lpKey] = (lpCounts[lpKey] || 0) + 1;
    if (!lpFirstRow[lpKey]) {
      lpFirstRow[lpKey] = rowNum;
    }

    if (!equipCode) {
      mpAddFinding_(findings, MIGRATION_PREVIEW.SEVERITY.ERROR, 'V-LP-001',
        'missing_equipment_id', src, rowNum, 'Equipment Code', '',
        'LP must reference equipment_id (via Equipment Code)');
    } else if (!ctx.equipmentTags[mpNormalizeKey_(equipCode)]) {
      mpAddFinding_(findings, MIGRATION_PREVIEW.SEVERITY.ERROR, 'V-LP-001',
        'missing_equipment_id', src, rowNum, 'Equipment Code', equipCode,
        'Equipment Code not found in Users_Config.Equipment');
    }

    if (!areaVal) {
      mpAddFinding_(findings, MIGRATION_PREVIEW.SEVERITY.ERROR, 'V-AREA-002',
        'missing_area', src, rowNum, 'Area', '',
        'LP missing area');
    } else {
      var areaRes = mpResolveArea_(ctx, areaVal, ctx.lps.workbook, ctx.lps.sheet);
      if (areaRes.resolution === 'unmapped') {
        mpAddFinding_(findings, MIGRATION_PREVIEW.SEVERITY.ERROR, 'V-MAP-001',
          'unmapped_legacy_value', src, rowNum, 'Area', areaVal,
          'No Legacy_Area_Mapping for area value');
      } else if (areaRes.resolution === 'invalid_destination') {
        mpAddFinding_(findings, MIGRATION_PREVIEW.SEVERITY.ERROR, 'V-MAP-002',
          'invalid_mapping_destination', src, rowNum, 'Area', areaVal,
          'Area mapping points to missing Areas row');
      } else if (contractor) {
        var contractorRes = mpResolveContractor_(ctx, contractor);
        var areaMeta = areaRes.areaMeta;
        if (contractorRes.resolution === 'unmapped') {
          mpAddFinding_(findings, MIGRATION_PREVIEW.SEVERITY.ERROR, 'V-MAP-001',
            'unmapped_legacy_value', src, rowNum, 'Contractor', contractor,
            'No Legacy_Contractor_Mapping for contractor value');
        } else if (areaMeta && areaMeta.responsibleContractorId
          && contractorRes.contractorId
          && mpNormalizeKey_(contractorRes.contractorId)
            !== mpNormalizeKey_(areaMeta.responsibleContractorId)) {
          mpAddFinding_(findings, MIGRATION_PREVIEW.SEVERITY.WARNING, 'V-AREA-003',
            'equipment_area_contractor_mismatch', src, rowNum, 'Contractor', contractor,
            'LP contractor ≠ area responsible contractor');
        }
      }
    }

    if (!oilType) {
      mpAddFinding_(findings, MIGRATION_PREVIEW.SEVERITY.WARNING, 'V-OIL-001',
        'missing_oil_type', src, rowNum, 'Lubricant Type', '',
        'LP has no lubricant type — will need derivation or default at migration');
    } else {
      var oilRes = mpResolveOilType_(ctx, oilType);
      if (oilRes.resolution === 'unmapped') {
        mpAddFinding_(findings, MIGRATION_PREVIEW.SEVERITY.ERROR, 'V-MAP-001',
          'unmapped_legacy_value', src, rowNum, 'Lubricant Type', oilType,
          'No Legacy_Oil_Type_Mapping for lubricant type');
      } else if (oilRes.resolution === 'invalid_destination') {
        mpAddFinding_(findings, MIGRATION_PREVIEW.SEVERITY.ERROR, 'V-MAP-002',
          'invalid_mapping_destination', src, rowNum, 'Lubricant Type', oilType,
          'Oil type mapping points to missing Oil_Types row');
      }
    }
  }

  for (var key in lpCounts) {
    if (lpCounts[key] > 1) {
      mpAddFinding_(findings, MIGRATION_PREVIEW.SEVERITY.BLOCKER, 'V-LP-DUP',
        'duplicate_lp_id', ctx.lps.workbook + ' / ' + ctx.lps.sheet,
        lpFirstRow[key], 'LP ID', key,
        'Duplicate LP ID — ' + lpCounts[key] + ' rows');
    }
  }
}

/**
 * @param {Object} ctx
 * @param {Object[]} findings
 */
function mpValidateLubricantTypes_(ctx, findings) {
  for (var i = 0; i < ctx.lubricantTypes.rows.length; i++) {
    var row = ctx.lubricantTypes.rows[i];
    var name = mpCell_(row, ctx.lubricantTypes.index, 'Name');
    var brand = mpCell_(row, ctx.lubricantTypes.index, 'Brand');
    var src = ctx.lubricantTypes.workbook + ' / ' + ctx.lubricantTypes.sheet;
    var rowNum = row._sourceRow;

    if (!name) {
      continue;
    }

    var oilRes = mpResolveOilType_(ctx, name);
    if (oilRes.resolution === 'unmapped') {
      mpAddFinding_(findings, MIGRATION_PREVIEW.SEVERITY.ERROR, 'V-MAP-001',
        'unmapped_legacy_value', src, rowNum, 'Name', name,
        'No Legacy_Oil_Type_Mapping for lubricant type name');
    } else if (oilRes.resolution === 'invalid_destination') {
      mpAddFinding_(findings, MIGRATION_PREVIEW.SEVERITY.ERROR, 'V-MAP-002',
        'invalid_mapping_destination', src, rowNum, 'Name', name,
        'Oil type mapping points to missing Oil_Types row');
    }

    if (brand) {
      var brandRes = mpResolveOilBrand_(ctx, brand);
      if (brandRes.resolution === 'unmapped') {
        mpAddFinding_(findings, MIGRATION_PREVIEW.SEVERITY.WARNING, 'V-MAP-001',
          'unmapped_legacy_value', src, rowNum, 'Brand', brand,
          'No Legacy_Oil_Brand_Mapping for brand');
      } else if (brandRes.resolution === 'invalid_destination') {
        mpAddFinding_(findings, MIGRATION_PREVIEW.SEVERITY.ERROR, 'V-MAP-002',
          'invalid_mapping_destination', src, rowNum, 'Brand', brand,
          'Oil brand mapping points to missing Oil_Brands row');
      }
    }
  }
}

/**
 * @param {Object} ctx
 * @param {Object[]} findings
 */
function mpValidateEquipmentRegister_(ctx, findings) {
  var codeCounts = {};
  for (var i = 0; i < ctx.equipmentRegister.rows.length; i++) {
    var row = ctx.equipmentRegister.rows[i];
    var code = mpCell_(row, ctx.equipmentRegister.index, 'Equipment Code');
    var lineVal = mpCell_(row, ctx.equipmentRegister.index, 'Line');
    var areaVal = mpCell_(row, ctx.equipmentRegister.index, 'Area');
    var src = ctx.equipmentRegister.workbook + ' / ' + ctx.equipmentRegister.sheet;
    var rowNum = row._sourceRow;

    if (!code) {
      continue;
    }

    var key = mpNormalizeKey_(code);
    codeCounts[key] = (codeCounts[key] || 0) + 1;

    if (lineVal) {
      var lineRes = mpResolveLine_(ctx, lineVal);
      if (lineRes.resolution === 'unmapped') {
        mpAddFinding_(findings, MIGRATION_PREVIEW.SEVERITY.ERROR, 'V-MAP-001',
          'unmapped_legacy_value', src, rowNum, 'Line', lineVal,
          'No Legacy_Line_Mapping for production line');
      }
    }

    if (areaVal) {
      var areaRes = mpResolveArea_(ctx, areaVal, ctx.equipmentRegister.workbook, ctx.equipmentRegister.sheet);
      if (areaRes.resolution === 'unmapped') {
        mpAddFinding_(findings, MIGRATION_PREVIEW.SEVERITY.ERROR, 'V-MAP-001',
          'unmapped_legacy_value', src, rowNum, 'Area', areaVal,
          'No Legacy_Area_Mapping for area value');
      } else if (areaRes.resolution === 'invalid_destination') {
        mpAddFinding_(findings, MIGRATION_PREVIEW.SEVERITY.ERROR, 'V-MAP-002',
          'invalid_mapping_destination', src, rowNum, 'Area', areaVal,
          'Area mapping points to missing Areas row');
      }
    }
  }

  var dupCodes = 0;
  for (var k in codeCounts) {
    if (codeCounts[k] > 1) {
      dupCodes++;
    }
  }

  if (dupCodes > 0) {
    mpAddFinding_(findings, MIGRATION_PREVIEW.SEVERITY.INFO, 'V-REG-INFO',
      'equipment_register_duplicates', 'Equipment Register', 'EQ Rigester', '',
      dupCodes + ' equipment codes appear on multiple lines (preserved in Equipment_Line_Assignments)');
  }
}

/**
 * @param {Object} ctx
 * @param {Object[]} findings
 */
function mpEmitUnmappedFindings_(ctx, findings) {
  for (var key in ctx.unmappedValues) {
    var item = ctx.unmappedValues[key];
    mpAddFinding_(findings, item.severity, 'V-MAP-001', 'unmapped_legacy_value',
      'Legacy Mapping Layer', '', item.category, item.legacyValue,
      item.occurrences + ' occurrence(s)'
        + (item.suggestedDestination ? ' — suggested: ' + item.suggestedDestination : ''));
  }
}

/**
 * @param {Object} ctx
 * @param {Object[]} findings
 */
function mpValidateDates_(ctx, findings) {
  mpValidateDateColumn_(ctx.history, 'Lubrication Date', 'Lubrication History', findings);
  mpValidateDateColumn_(ctx.lps, 'Last Oil Sample Date', 'Lubrication Points', findings);
  mpValidateDateColumn_(ctx.dataEntry, 'Sample Date', 'Data_Entry', findings);
}

/**
 * @param {Object} sheetData
 * @param {string} columnName
 * @param {string} label
 * @param {Object[]} findings
 */
function mpValidateDateColumn_(sheetData, columnName, label, findings) {
  if (!sheetData || !sheetData.rows || sheetData.rows.length === 0) {
    return;
  }

  var colIdx = sheetData.index[columnName];
  if (colIdx === undefined) {
    return;
  }

  for (var i = 0; i < sheetData.rows.length; i++) {
    var row = sheetData.rows[i];
    var raw = row._values[colIdx];
    if (!mpHasValue_(raw)) {
      continue;
    }

    var parsed = mpParseDate_(raw);
    if (!parsed.valid) {
      mpAddFinding_(findings, MIGRATION_PREVIEW.SEVERITY.ERROR, 'V-DATE-001',
        'invalid_date', sheetData.workbook + ' / ' + sheetData.sheet,
        row._sourceRow, columnName, String(raw),
        'Unparseable date in ' + label);
    }
  }
}

// ─── SUMMARY ──────────────────────────────────────────────────────────────────

/**
 * @param {Object} ctx
 * @param {Object[]} findings
 * @returns {Object}
 */
function mpBuildSummary_(ctx, findings) {
  var counts = { INFO: 0, WARNING: 0, ERROR: 0, BLOCKER: 0 };
  for (var i = 0; i < findings.length; i++) {
    var sev = findings[i].severity;
    if (counts[sev] !== undefined) {
      counts[sev]++;
    }
  }

  var candidates = {
    areas: mpCountImportCandidates_(ctx.areas, function (row) {
      return mpCell_(row, ctx.areas.index, 'Location Code')
        && mpCell_(row, ctx.areas.index, 'Contractor');
    }),
    equipment: mpCountImportCandidates_(ctx.equipment, function (row) {
      return mpCell_(row, ctx.equipment.index, 'Equipment Code')
        && mpCell_(row, ctx.equipment.index, 'Area');
    }),
    lps: mpCountDataRows_(ctx.lps),
    oilTypes: mpCountDataRows_(ctx.lubricantTypes),
    oilProducts: mpEstimateOilProducts_(ctx.lubricantTypes),
    lineAssignments: mpCountDataRows_(ctx.equipmentRegister),
  };

  var importedCandidateCount = candidates.areas + candidates.equipment
    + candidates.lps + candidates.oilTypes + candidates.oilProducts + candidates.lineAssignments;

  var unmappedList = [];
  for (var uKey in ctx.unmappedValues) {
    unmappedList.push(ctx.unmappedValues[uKey]);
  }
  unmappedList.sort(function (a, b) {
    return b.occurrences - a.occurrences;
  });

  return {
    generatedAt: new Date().toISOString(),
    sprint: MIGRATION_PREVIEW.SPRINT,
    importedCandidateCount: importedCandidateCount,
    candidates: candidates,
    targetCounts: ctx.targetCounts,
    sourceCounts: ctx.sourceCounts,
    infoCount: counts.INFO,
    warningCount: counts.WARNING,
    errorCount: counts.ERROR,
    blockerCount: counts.BLOCKER,
    mappingStats: ctx.mappingStats,
    unmappedLegacyValues: unmappedList,
    areaContractorRule: 'One responsible_contractor_id per area; no shared areas',
    visibilityRule: 'ACC=all; RHI=RHI areas; ASEC=ASEC areas',
    mappingLayerRule: 'Legacy value → Legacy Mapping Layer → Platform Master Data',
  };
}

// ─── REPORT WRITER ────────────────────────────────────────────────────────────

/**
 * Writes ONLY to Migration_Preview_Report — never touches protected master sheets.
 * @param {string} targetId
 * @param {Object} summary
 * @param {Object} ctx
 * @param {Object[]} findings
 */
function mpWritePreviewReport_(targetId, summary, ctx, findings) {
  var ss = SpreadsheetApp.openById(targetId);
  var sheet = ss.getSheetByName(MIGRATION_PREVIEW.REPORT_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(MIGRATION_PREVIEW.REPORT_SHEET);
  }

  sheet.clear();
  var rows = [];

  rows.push(['ACC Reliability Platform — Master Data Migration Preview']);
  rows.push(['Sprint', MIGRATION_PREVIEW.SPRINT]);
  rows.push(['Generated', summary.generatedAt]);
  rows.push(['Mode', 'PREVIEW ONLY — no data migrated']);
  rows.push(['Mapping flow', summary.mappingLayerRule]);
  rows.push([]);

  rows.push(['=== SUMMARY ===']);
  rows.push(['Metric', 'Value']);
  rows.push(['Imported candidate count', summary.importedCandidateCount]);
  rows.push(['INFO count', summary.infoCount]);
  rows.push(['WARNING count', summary.warningCount]);
  rows.push(['ERROR count', summary.errorCount]);
  rows.push(['BLOCKER count', summary.blockerCount]);
  rows.push(['Area contractor rule', summary.areaContractorRule]);
  rows.push(['Visibility rule', summary.visibilityRule]);
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

  rows.push(['=== UNMAPPED LEGACY VALUES ===']);
  rows.push(['Category', 'Legacy Value', 'Occurrences', 'Suggested Destination', 'Severity']);
  if (summary.unmappedLegacyValues.length === 0) {
    rows.push(['—', '—', '—', '—', '—']);
  } else {
    for (var u = 0; u < summary.unmappedLegacyValues.length; u++) {
      var uv = summary.unmappedLegacyValues[u];
      rows.push([uv.category, uv.legacyValue, uv.occurrences, uv.suggestedDestination, uv.severity]);
    }
  }
  rows.push([]);

  rows.push(['=== SOURCE ROW COUNTS ===']);
  rows.push(['Workbook', 'Sheet', 'Data Rows']);
  for (var s = 0; s < summary.sourceCounts.length; s++) {
    var sc = summary.sourceCounts[s];
    rows.push([sc.workbook, sc.sheet, sc.rowCount]);
  }
  rows.push([]);

  rows.push(['=== TARGET MAPPING COUNTS (candidates) ===']);
  rows.push(['Target Sheet', 'Candidate Rows']);
  var tc = summary.targetCounts;
  rows.push(['Areas', tc.Areas]);
  rows.push(['Contractors', tc.Contractors]);
  rows.push(['Equipment_Master', tc.Equipment_Master]);
  rows.push(['LP_Master', tc.LP_Master]);
  rows.push(['Oil_Types', tc.Oil_Types]);
  rows.push(['Oil_Brands', tc.Oil_Brands]);
  rows.push(['Oil_Products', tc.Oil_Products]);
  rows.push(['Equipment_Line_Assignments', tc.Equipment_Line_Assignments]);
  rows.push([]);

  mpAppendFindingSection_(rows, '=== UNMAPPED LEGACY VALUE FINDINGS ===',
    findings, 'unmapped_legacy_value');
  mpAppendFindingSection_(rows, '=== INVALID MAPPING DESTINATION ===',
    findings, 'invalid_mapping_destination');
  mpAppendFindingSection_(rows, '=== DUPLICATE EQUIPMENT_ID (equipment_tag) ===',
    findings, 'duplicate_equipment_id');
  mpAppendFindingSection_(rows, '=== DUPLICATE LP_ID ===',
    findings, 'duplicate_lp_id');
  mpAppendFindingSection_(rows, '=== MISSING EQUIPMENT_ID (LP) ===',
    findings, 'missing_equipment_id');
  mpAppendFindingSection_(rows, '=== MISSING AREA ===',
    findings, 'missing_area');
  mpAppendFindingSection_(rows, '=== MISSING RESPONSIBLE_CONTRACTOR_ID ===',
    findings, 'missing_responsible_contractor_id');
  mpAppendFindingSection_(rows, '=== EQUIPMENT-AREA-CONTRACTOR MISMATCH ===',
    findings, 'equipment_area_contractor_mismatch');
  mpAppendFindingSection_(rows, '=== MISSING OIL TYPE ===',
    findings, 'missing_oil_type');
  mpAppendFindingSection_(rows, '=== INVALID DATE ===',
    findings, 'invalid_date');
  mpAppendFindingSection_(rows, '=== EQUIPMENT REGISTER DUPLICATES (INFO) ===',
    findings, 'equipment_register_duplicates');

  rows.push([]);
  rows.push(['=== ALL FINDINGS ===']);
  rows.push(['Severity', 'Rule', 'Category', 'Source', 'Row', 'Field', 'Value', 'Message']);
  for (var f = 0; f < findings.length; f++) {
    var item = findings[f];
    rows.push([
      item.severity,
      item.ruleId,
      item.category,
      item.source,
      item.sourceRow,
      item.field,
      item.value,
      item.message,
    ]);
  }

  if (rows.length > 0) {
    var padded = mpPadRows_(rows, 8);
    sheet.getRange(1, 1, padded.length, 8).setValues(padded);
  }

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 8);
}

/**
 * @param {Array[]} rows
 * @param {string} title
 * @param {Object[]} findings
 * @param {string} category
 */
function mpAppendFindingSection_(rows, title, findings, category) {
  rows.push([]);
  rows.push([title]);
  rows.push(['Severity', 'Rule', 'Source', 'Row', 'Field', 'Value', 'Message']);
  var matched = mpFilterFindingsByCategory_(findings, category);
  if (matched.length === 0) {
    rows.push(['—', '—', '—', '—', '—', '—', 'No issues']);
    return;
  }
  for (var i = 0; i < matched.length; i++) {
    var item = matched[i];
    rows.push([
      item.severity,
      item.ruleId,
      item.source,
      item.sourceRow,
      item.field,
      item.value,
      item.message,
    ]);
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * @returns {Object<string, string>}
 */
function mpLoadSourceIds_() {
  var props = PropertiesService.getScriptProperties();
  return {
    OPERATIONAL: mpPropOrEmpty_(props, MIGRATION_PREVIEW.SOURCE_PROPS.OPERATIONAL),
    USERS_CONFIG: mpPropOrEmpty_(props, MIGRATION_PREVIEW.SOURCE_PROPS.USERS_CONFIG),
    OIL_ANALYSIS: mpPropOrEmpty_(props, MIGRATION_PREVIEW.SOURCE_PROPS.OIL_ANALYSIS),
    EQUIPMENT_REGISTER: mpPropOrEmpty_(props, MIGRATION_PREVIEW.SOURCE_PROPS.EQUIPMENT_REGISTER),
  };
}

/**
 * @param {string} targetId
 */
function mpAssertProtectedSheetsUntouched_(targetId) {
  var ss = SpreadsheetApp.openById(targetId);
  for (var i = 0; i < MIGRATION_PREVIEW.PROTECTED_SHEETS.length; i++) {
    var name = MIGRATION_PREVIEW.PROTECTED_SHEETS[i];
    if (!ss.getSheetByName(name)) {
      mpLog_('NOTE: Protected sheet not present yet (OK for empty workbook): ' + name);
    }
  }
}

/**
 * @param {string} propName
 * @returns {string}
 */
function mpRequireProp_(propName) {
  var props = PropertiesService.getScriptProperties();
  var value = mpPropOrEmpty_(props, propName);
  if (!value) {
    throw new Error(
      'Script property "' + propName + '" is not set. '
      + 'Configure master data workbook ID before running preview.'
    );
  }
  return value;
}

/**
 * @param {GoogleAppsScript.Properties.Properties} props
 * @param {string} key
 * @returns {string}
 */
function mpPropOrEmpty_(props, key) {
  var raw = props.getProperty(key);
  if (!raw) {
    return '';
  }
  var trimmed = String(raw).trim();
  if (trimmed.indexOf('REPLACE_') === 0) {
    return '';
  }
  return trimmed;
}

/**
 * @param {Object} row
 * @param {Object} index
 * @param {string} column
 * @returns {string}
 */
function mpCell_(row, index, column) {
  var idx = index[column];
  if (idx === undefined) {
    return '';
  }
  return String(row._values[idx] || '').trim();
}

/**
 * @param {*} value
 * @returns {boolean}
 */
function mpHasValue_(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

/**
 * @param {*} header
 * @returns {string}
 */
function mpNormalizeHeader_(header) {
  return String(header || '')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {string} value
 * @returns {string}
 */
function mpNormalizeKey_(value) {
  return String(value || '').trim().toUpperCase();
}

/**
 * @param {Object} sheetData
 * @returns {number}
 */
function mpCountDataRows_(sheetData) {
  return sheetData && sheetData.rows ? sheetData.rows.length : 0;
}

/**
 * @param {Object} sheetData
 * @param {Function} predicate
 * @returns {number}
 */
function mpCountImportCandidates_(sheetData, predicate) {
  if (!sheetData || !sheetData.rows) {
    return 0;
  }
  var count = 0;
  for (var i = 0; i < sheetData.rows.length; i++) {
    if (predicate(sheetData.rows[i])) {
      count++;
    }
  }
  return count;
}

/**
 * @param {Object} areasData
 * @returns {string[]}
 */
function mpUniqueLegacyContractors_(areasData) {
  var seen = {};
  var list = [];
  if (!areasData || !areasData.rows) {
    return list;
  }
  for (var i = 0; i < areasData.rows.length; i++) {
    var c = mpCell_(areasData.rows[i], areasData.index, 'Contractor');
    if (c && !seen[mpNormalizeKey_(c)]) {
      seen[mpNormalizeKey_(c)] = true;
      list.push(c);
    }
  }
  return list;
}

/**
 * @param {Object} lubricantData
 * @returns {number}
 */
function mpEstimateOilProducts_(lubricantData) {
  if (!lubricantData || !lubricantData.rows) {
    return 0;
  }
  var seen = {};
  var count = 0;
  for (var i = 0; i < lubricantData.rows.length; i++) {
    var name = mpCell_(lubricantData.rows[i], lubricantData.index, 'Name');
    var brand = mpCell_(lubricantData.rows[i], lubricantData.index, 'Brand');
    var key = mpNormalizeKey_(name) + '|' + mpNormalizeKey_(brand);
    if (name && !seen[key]) {
      seen[key] = true;
      count++;
    }
  }
  return count;
}

/**
 * @param {Object} lubricantData
 * @returns {string[]}
 */
function mpUniqueBrands_(lubricantData) {
  var seen = {};
  var list = [];
  if (!lubricantData || !lubricantData.rows) {
    return list;
  }
  for (var i = 0; i < lubricantData.rows.length; i++) {
    var b = mpCell_(lubricantData.rows[i], lubricantData.index, 'Brand');
    if (b && !seen[mpNormalizeKey_(b)]) {
      seen[mpNormalizeKey_(b)] = true;
      list.push(b);
    }
  }
  return list;
}

/**
 * @param {Object[]} findings
 * @param {string} severity
 * @returns {Object[]}
 */
function mpFilterFindings_(findings, severity) {
  var out = [];
  for (var i = 0; i < findings.length; i++) {
    if (findings[i].severity === severity) {
      out.push(findings[i]);
    }
  }
  return out;
}

/**
 * @param {Object[]} findings
 * @param {string} category
 * @returns {Object[]}
 */
function mpFilterFindingsByCategory_(findings, category) {
  var out = [];
  for (var i = 0; i < findings.length; i++) {
    if (findings[i].category === category) {
      out.push(findings[i]);
    }
  }
  return out;
}

/**
 * @param {Object[]} findings
 * @param {string} severity
 * @param {string} ruleId
 * @param {string} category
 * @param {string} source
 * @param {number|string} sourceRow
 * @param {string} field
 * @param {string} value
 * @param {string} message
 */
function mpAddFinding_(findings, severity, ruleId, category, source, sourceRow, field, value, message) {
  findings.push({
    severity: severity,
    ruleId: ruleId,
    category: category,
    source: source,
    sourceRow: sourceRow,
    field: field,
    value: value,
    message: message,
  });
}

/**
 * @param {*} raw
 * @returns {{ valid: boolean, iso: string }}
 */
function mpParseDate_(raw) {
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return { valid: true, iso: raw.toISOString().slice(0, 10) };
  }

  if (typeof raw === 'number' && raw > 30000 && raw < 60000) {
    var excelEpoch = new Date(Date.UTC(1899, 11, 30));
    var ms = excelEpoch.getTime() + Math.round(raw * 86400000);
    var d = new Date(ms);
    if (!isNaN(d.getTime())) {
      return { valid: true, iso: d.toISOString().slice(0, 10) };
    }
  }

  var str = String(raw).trim();
  if (!str) {
    return { valid: false, iso: '' };
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return { valid: true, iso: str.slice(0, 10) };
  }

  var parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return { valid: true, iso: parsed.toISOString().slice(0, 10) };
  }

  return { valid: false, iso: '' };
}

/**
 * @param {Array[]} rows
 * @param {number} width
 * @returns {Array[]}
 */
function mpPadRows_(rows, width) {
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i].slice();
    while (row.length < width) {
      row.push('');
    }
    out.push(row);
  }
  return out;
}

/**
 * @param {string} message
 */
function mpLog_(message) {
  Logger.log('[MigrationPreview] ' + message);
}

/**
 * Verifies script properties for preview run (optional diagnostic).
 * @returns {Object}
 */
function verifyMigrationPreviewConfig() {
  var props = PropertiesService.getScriptProperties();
  var report = {
    target: mpPropOrEmpty_(props, MIGRATION_PREVIEW.TARGET_PROP),
    sources: mpLoadSourceIds_(),
    ready: true,
    missing: [],
  };

  if (!report.target) {
    report.missing.push(MIGRATION_PREVIEW.TARGET_PROP);
    report.ready = false;
  }

  var sourceKeys = Object.keys(MIGRATION_PREVIEW.SOURCE_PROPS);
  for (var i = 0; i < sourceKeys.length; i++) {
    var key = sourceKeys[i];
    if (!report.sources[key]) {
      report.missing.push(MIGRATION_PREVIEW.SOURCE_PROPS[key]);
      report.ready = false;
    }
  }

  mpLog_(JSON.stringify(report));
  return report;
}
