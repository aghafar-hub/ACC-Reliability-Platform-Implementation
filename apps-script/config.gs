/**
 * Master-data Google Sheets configuration.
 *
 * Set Script property `MASTER_DATA_SPREADSHEET_ID` to the target spreadsheet ID.
 * Deployed environments should never rely on the placeholder value.
 */
var MASTER_DATA_CONFIG = {
  SPREADSHEET_ID_PROPERTY: 'MASTER_DATA_SPREADSHEET_ID',
  SPREADSHEET_ID_PLACEHOLDER: 'REPLACE_WITH_SPREADSHEET_ID',
  SHEETS: {
    EQUIPMENT: 'Equipment_Master',
    LP: 'LP_Master',
  },
  EQUIPMENT_COLUMNS: [
    'equipmentId',
    'name',
    'area',
    'contractorId',
    'status',
    'createdAt',
    'updatedAt',
  ],
  LP_COLUMNS: [
    'lpId',
    'equipmentId',
    'name',
    'lubricant',
    'frequencyDays',
    'oaRequired',
    'samplingIntervalDays',
    'status',
    'area',
    'contractorId',
    'createdAt',
    'updatedAt',
  ],
};

/**
 * @returns {string|null}
 */
function getMasterDataSpreadsheetId() {
  var props = PropertiesService.getScriptProperties();
  var configured = props.getProperty(MASTER_DATA_CONFIG.SPREADSHEET_ID_PROPERTY);
  var id = configured ? String(configured).trim() : '';

  if (!id || id === MASTER_DATA_CONFIG.SPREADSHEET_ID_PLACEHOLDER) {
    return null;
  }

  return id;
}
