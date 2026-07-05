/**
 * Master Data lookup/mapping sheet catalog for repairMasterDataLookupSheets().
 * Column definitions mirror database/initializeAccDatabase.gs (W2 lookup sheets).
 *
 * @param {string} hdr Header color (unused — kept for parity with initializer)
 * @returns {{ name: string, colDefs: Object[], samples: Array[] }[]}
 */
function masterDataLookupSheetCatalog_(hdr) {
  return [
    {
      name: 'Areas',
      colDefs: [
        col_('A', 'area_id',                  'PK', 'AREA-XXX'),
        col_('B', 'area_code',                'R',  'Short UPPERCASE code — unique'),
        col_('C', 'area_name',                'R',  'Full area name'),
        col_('D', 'main_area',                'O',  'Production unit / plant section'),
        col_('E', 'line',                     'O',  'Production line identifier'),
        col_('F', 'responsible_contractor_id','R',  '→ Contractors — one per area', null),
        col_('G', 'status',                   'R',  'ACTIVE or INACTIVE',          LIST.AREA_STATUS),
        col_('H', 'created_at',               'S',  'ISO timestamp'),
        col_('I', 'updated_at',               'S',  'ISO timestamp')
      ],
      samples: [
        ['AREA-001', '111', 'Area 111',         'Kiln',      'Line1', 'CTR-001', 'ACTIVE', ts_(), ts_()],
        ['AREA-002', '312', 'Area 312',         'Raw Mill',  'Line2', 'CTR-001', 'ACTIVE', ts_(), ts_()],
        ['AREA-003', 'ASEC-01', 'ASEC Section', 'ASEC Plant','Line1', 'CTR-002', 'ACTIVE', ts_(), ts_()]
      ]
    },
    {
      name: 'Contractors',
      colDefs: [
        col_('A', 'contractor_id',   'PK', 'CTR-XXX'),
        col_('B', 'contractor_code', 'R',  'Short UPPERCASE code — unique'),
        col_('C', 'contractor_name', 'R',  'Company name'),
        col_('D', 'contractor_type', 'R',  'Contractor category',   LIST.CONTRACTOR_TYPE),
        col_('E', 'contact_person',  'O',  'Primary contact name'),
        col_('F', 'email',           'O',  'Contact email'),
        col_('G', 'phone',           'O',  'Contact phone'),
        col_('H', 'scope',           'O',  'Service scope description'),
        col_('I', 'status',          'R',  'ACTIVE or INACTIVE',    LIST.ENTITY_STATUS),
        col_('J', 'created_at',      'S',  'ISO timestamp'),
        col_('K', 'updated_at',      'S',  'ISO timestamp')
      ],
      samples: [
        ['CTR-001', 'RHI', 'Reliance Heavy Industries (RHI)', 'MAINTENANCE', 'Operations Manager', 'ops@rhi.example.com', '+20-2-555-0001', 'Plant maintenance contractor', 'ACTIVE', ts_(), ts_()],
        ['CTR-002', 'ASEC', 'ASEC', 'MAINTENANCE', 'Site Manager', 'ops@asec.example.com', '+20-2-555-0002', 'ASEC plant operations', 'ACTIVE', ts_(), ts_()],
        ['CTR-003', 'LAB-01', 'Sample Oil Analysis Lab', 'OIL_LAB', 'Lab Manager', 'lab@example.com', '+966-11-555-0001', 'Oil analysis laboratory', 'ACTIVE', ts_(), ts_()]
      ]
    },
    {
      name: 'Oil_Types',
      colDefs: [
        col_('A', 'oil_type_id',      'PK', 'OT-XXX'),
        col_('B', 'type_code',        'R',  'Short code (e.g. VG46) — unique'),
        col_('C', 'type_name',        'R',  'Full product name'),
        col_('D', 'viscosity_grade',  'R',  'ISO grade (e.g. VG32, VG46, VG320)'),
        col_('E', 'base_type',        'O',  'Base oil category',  LIST.BASE_TYPE),
        col_('F', 'application_notes','O',  'Recommended applications'),
        col_('G', 'is_active',        'R',  'TRUE/FALSE',          LIST.BOOLEAN),
        col_('H', 'created_at',       'S',  'ISO timestamp')
      ],
      samples: [
        ['OT-001', 'VG320', 'Industrial Gear Oil ISO VG 320', 'VG320', 'MINERAL',   'Gearboxes, enclosed drives',        'TRUE', ts_()],
        ['OT-002', 'VG46',  'Hydraulic Oil ISO VG 46',       'VG46',  'MINERAL',   'Hydraulic systems, bearings',       'TRUE', ts_()],
        ['OT-003', 'VG68',  'Compressor Oil ISO VG 68',      'VG68',  'SYNTHETIC', 'Rotary screw compressors',          'TRUE', ts_()],
        ['OT-004', 'VG100', 'Turbine Oil ISO VG 100',         'VG100', 'MINERAL',   'Steam and gas turbines',            'TRUE', ts_()],
        ['OT-005', 'VG150', 'Gear Oil ISO VG 150',            'VG150', 'MINERAL',   'Open gears, manual gearboxes',      'TRUE', ts_()]
      ]
    },
    {
      name: 'Oil_Brands',
      colDefs: [
        col_('A', 'brand_id',    'PK', 'OB-XXX'),
        col_('B', 'brand_name',  'R',  'Product brand name'),
        col_('C', 'manufacturer','R',  'OEM company name'),
        col_('D', 'product_line','O',  'Product family'),
        col_('E', 'is_active',   'R',  'TRUE/FALSE',  LIST.BOOLEAN),
        col_('F', 'created_at',  'S',  'ISO timestamp')
      ],
      samples: [
        ['OB-001', 'Shell Omala S2 G 320',  'Shell',   'Omala S2',     'TRUE', ts_()],
        ['OB-002', 'Shell Tellus S2 MX 46', 'Shell',   'Tellus S2',    'TRUE', ts_()],
        ['OB-003', 'Mobil SHC Gear 320',    'Mobil',   'SHC Gear',     'TRUE', ts_()],
        ['OB-004', 'Castrol Tribol 1100',   'Castrol', 'Tribol',       'TRUE', ts_()],
        ['OB-005', 'Total Nevastane SH 46', 'Total',   'Nevastane SH', 'TRUE', ts_()]
      ]
    },
    {
      name: 'Oil_Products',
      colDefs: [
        col_('A', 'oil_product_id',  'PK', 'OP-XXX'),
        col_('B', 'oil_type_id',     'FK', '→ Oil_Types — required'),
        col_('C', 'oil_brand_id',    'FK', '→ Oil_Brands — required'),
        col_('D', 'product_name',    'R',  'Commercial product name'),
        col_('E', 'iso_vg',          'O',  'ISO viscosity grade (e.g. VG46)'),
        col_('F', 'application',     'O',  'Intended application'),
        col_('G', 'oem_approval',    'O',  'OEM approval reference'),
        col_('H', 'density',         'O',  'Density kg/L at 15°C'),
        col_('I', 'viscosity',       'O',  'Nominal viscosity description'),
        col_('J', 'flash_point',     'O',  'Flash point °C'),
        col_('K', 'msds_url',        'O',  'MSDS document URL'),
        col_('L', 'safety_notes',    'O',  'Handling / storage notes'),
        col_('M', 'status',          'R',  'ACTIVE or INACTIVE', LIST.ENTITY_STATUS),
        col_('N', 'created_at',      'S',  'ISO timestamp'),
        col_('O', 'updated_at',      'S',  'ISO timestamp')
      ],
      samples: [
        ['OP-001', 'OT-001', 'OB-001', 'Shell Omala S2 G 320', 'VG320', 'Gearboxes', '', '', '', '', '', '', 'ACTIVE', ts_(), ts_()],
        ['OP-002', 'OT-002', 'OB-002', 'Shell Tellus S2 MX 46', 'VG46', 'Hydraulic systems', '', '', '', '', '', '', 'ACTIVE', ts_(), ts_()]
      ]
    },
    {
      name: 'Equipment_Types',
      colDefs: [
        col_('A', 'type_id',            'PK', 'ET-XXX'),
        col_('B', 'type_code',          'R',  'UPPERCASE — unique (e.g. PUMP)'),
        col_('C', 'type_name',          'R',  'Full name (e.g. Centrifugal Pump)'),
        col_('D', 'description',        'O',  'Usage notes'),
        col_('E', 'default_criticality','O',  'Default for new equipment',  LIST.CRITICALITY),
        col_('F', 'is_active',          'R',  'TRUE/FALSE',                 LIST.BOOLEAN),
        col_('G', 'created_at',         'S',  'ISO timestamp')
      ],
      samples: [
        ['ET-001', 'PUMP',       'Centrifugal Pump',        'Rotary kinetic pump',           'A', 'TRUE', ts_()],
        ['ET-002', 'COMPRESSOR', 'Reciprocating Compressor','Gas compression',               'A', 'TRUE', ts_()],
        ['ET-003', 'GEARBOX',    'Gearbox / Reducer',       'Mechanical power transmission', 'B', 'TRUE', ts_()],
        ['ET-004', 'MOTOR',      'Electric Motor',          'Electric drive motor',          'B', 'TRUE', ts_()],
        ['ET-005', 'FAN',        'Industrial Fan',          'Forced or induced draft fan',   'B', 'TRUE', ts_()],
        ['ET-006', 'PUMP_SCREW', 'Screw Pump',              'Positive displacement pump',    'B', 'TRUE', ts_()]
      ]
    },
    {
      name: 'Status_Dictionary',
      colDefs: [
        col_('A', 'status_id',      'PK', 'Auto-int'),
        col_('B', 'module_id',      'R',  'Module scope',          LIST.MODULE_IDS),
        col_('C', 'entity_type',    'R',  'Entity this applies to'),
        col_('D', 'status_code',    'R',  'UPPERCASE — unique per entity'),
        col_('E', 'status_label_en','R',  'English label'),
        col_('F', 'status_label_ar','R',  'Arabic label'),
        col_('G', 'status_color',   'O',  'Hex color for UI badge'),
        col_('H', 'is_terminal',    'R',  'TRUE = no further transitions', LIST.BOOLEAN),
        col_('I', 'sort_order',     'O',  'Display order (integer)'),
        col_('J', 'is_active',      'R',  'TRUE/FALSE',             LIST.BOOLEAN)
      ],
      samples: [
        [1, 'OIL_LUB', 'OIL_CHANGE', 'SCHEDULED',        'Scheduled',         'مجدول',            '#1565C0', 'FALSE', 1, 'TRUE'],
        [2, 'OIL_LUB', 'OIL_CHANGE', 'IN_PROGRESS',     'In Progress',       'قيد التنفيذ',     '#F9A825', 'FALSE', 2, 'TRUE'],
        [3, 'OIL_LUB', 'OIL_CHANGE', 'PENDING_APPROVAL','Pending Approval',  'بانتظار الموافقة','#6A1B9A', 'FALSE', 3, 'TRUE'],
        [4, 'OIL_LUB', 'OIL_CHANGE', 'APPROVED',        'Approved',          'معتمد',           '#2E7D32', 'FALSE', 4, 'TRUE'],
        [5, 'OIL_LUB', 'OIL_CHANGE', 'COMPLETED',       'Completed',         'مكتمل',           '#1B5E20', 'TRUE',  5, 'TRUE'],
        [6, 'OIL_LUB', 'OIL_CHANGE', 'CANCELLED',       'Cancelled',         'ملغى',            '#757575', 'TRUE',  6, 'TRUE'],
        [7, 'OIL_LUB', 'OIL_CHANGE', 'OVERDUE',         'Overdue',           'متأخر',           '#B71C1C', 'FALSE', 7, 'TRUE']
      ]
    },
    {
      name: 'Legacy_Area_Mapping',
      colDefs: [
        col_('A', 'mapping_id',                'PK', 'MAP-AREA-XXXX'),
        col_('B', 'legacy_value',              'R',  'Legacy area code or name as it appears in source'),
        col_('C', 'legacy_workbook',           'O',  'Source workbook label (blank = any)'),
        col_('D', 'legacy_sheet',              'O',  'Source sheet tab (blank = any)'),
        col_('E', 'new_area_id',               'FK', '→ Areas.area_id — required when ACTIVE'),
        col_('F', 'new_area_code',             'O',  'Denormalized target area_code for review'),
        col_('G', 'new_area_name',             'O',  'Denormalized target area_name for review'),
        col_('H', 'responsible_contractor_id', 'FK', '→ Contractors — optional override'),
        col_('I', 'status',                    'R',  'ACTIVE or INACTIVE', LIST.MAPPING_STATUS),
        col_('J', 'notes',                     'O',  'Platform Owner notes'),
        col_('K', 'created_at',                'S',  'ISO timestamp'),
        col_('L', 'updated_at',                'S',  'ISO timestamp')
      ],
      samples: [
        ['MAP-AREA-001', '111',      'ACC_Oil_Users_Config', 'Areas', 'AREA-001', '111',     'Area 111',         'CTR-001', 'ACTIVE', 'Location code → Kiln area',     ts_(), ts_()],
        ['MAP-AREA-002', 'Area 111', 'ACC_Oil_Users_Config', 'Areas', 'AREA-001', '111',     'Area 111',         'CTR-001', 'ACTIVE', 'Area name variant',             ts_(), ts_()],
        ['MAP-AREA-003', '312',      'ACC_Oil_Users_Config', 'Areas', 'AREA-002', '312',     'Area 312',         'CTR-001', 'ACTIVE', 'Location code → Raw Mill',      ts_(), ts_()],
        ['MAP-AREA-004', 'Area 312', 'ACC_Oil_Users_Config', 'Areas', 'AREA-002', '312',     'Area 312',         'CTR-001', 'ACTIVE', 'Area name variant',             ts_(), ts_()],
        ['MAP-AREA-005', 'Area 123', 'ACC_Oil_Users_Config', 'Areas', 'AREA-002', '312',     'Area 312',         'CTR-001', 'ACTIVE', 'Legacy name → Raw Mill area',   ts_(), ts_()],
        ['MAP-AREA-006', 'ASEC-01',  'ACC_Oil_Users_Config', 'Areas', 'AREA-003', 'ASEC-01', 'ASEC Section',     'CTR-002', 'ACTIVE', 'ASEC plant section',            ts_(), ts_()]
      ]
    },
    {
      name: 'Legacy_Oil_Type_Mapping',
      colDefs: [
        col_('A', 'mapping_id',   'PK', 'MAP-OIL-XXXX'),
        col_('B', 'legacy_value', 'R',  'Legacy lubricant type name from source'),
        col_('C', 'new_value',    'FK', '→ Oil_Types.oil_type_id'),
        col_('D', 'status',       'R',  'ACTIVE or INACTIVE', LIST.MAPPING_STATUS),
        col_('E', 'notes',        'O',  'Platform Owner notes'),
        col_('F', 'created_at',   'S',  'ISO timestamp'),
        col_('G', 'updated_at',   'S',  'ISO timestamp')
      ],
      samples: [
        ['MAP-OIL-001', 'VG 320',         'OT-001', 'ACTIVE', 'ISO VG 320 gear oil',         ts_(), ts_()],
        ['MAP-OIL-002', 'ISO VG 46',      'OT-002', 'ACTIVE', 'Hydraulic oil VG 46',         ts_(), ts_()],
        ['MAP-OIL-003', 'Shell Omala S2', 'OT-001', 'ACTIVE', 'Brand-prefixed legacy name',  ts_(), ts_()]
      ]
    },
    {
      name: 'Legacy_Oil_Brand_Mapping',
      colDefs: [
        col_('A', 'mapping_id',   'PK', 'MAP-OBR-XXXX'),
        col_('B', 'legacy_value', 'R',  'Legacy brand name from source'),
        col_('C', 'new_value',    'FK', '→ Oil_Brands.brand_id'),
        col_('D', 'status',       'R',  'ACTIVE or INACTIVE', LIST.MAPPING_STATUS),
        col_('E', 'notes',        'O',  'Platform Owner notes'),
        col_('F', 'created_at',   'S',  'ISO timestamp'),
        col_('G', 'updated_at',   'S',  'ISO timestamp')
      ],
      samples: [
        ['MAP-OBR-001', 'Shell',   'OB-001', 'ACTIVE', 'Shell product line',   ts_(), ts_()],
        ['MAP-OBR-002', 'Mobil',   'OB-003', 'ACTIVE', 'Mobil product line',   ts_(), ts_()],
        ['MAP-OBR-003', 'Castrol', 'OB-004', 'ACTIVE', 'Castrol product line', ts_(), ts_()]
      ]
    },
    {
      name: 'Legacy_Equipment_Type_Mapping',
      colDefs: [
        col_('A', 'mapping_id',   'PK', 'MAP-EQT-XXXX'),
        col_('B', 'legacy_value', 'R',  'Legacy equipment type label'),
        col_('C', 'new_value',    'FK', '→ Equipment_Types.type_id'),
        col_('D', 'status',       'R',  'ACTIVE or INACTIVE', LIST.MAPPING_STATUS),
        col_('E', 'notes',        'O',  'Platform Owner notes'),
        col_('F', 'created_at',   'S',  'ISO timestamp'),
        col_('G', 'updated_at',   'S',  'ISO timestamp')
      ],
      samples: [
        ['MAP-EQT-001', 'Pump',       'ET-001', 'ACTIVE', 'Centrifugal pump',           ts_(), ts_()],
        ['MAP-EQT-002', 'Compressor', 'ET-002', 'ACTIVE', 'Reciprocating compressor',   ts_(), ts_()],
        ['MAP-EQT-003', 'Gearbox',    'ET-003', 'ACTIVE', 'Gearbox / reducer',          ts_(), ts_()]
      ]
    },
    {
      name: 'Legacy_Contractor_Mapping',
      colDefs: [
        col_('A', 'mapping_id',   'PK', 'MAP-CTR-XXXX'),
        col_('B', 'legacy_value', 'R',  'Legacy contractor name or code'),
        col_('C', 'new_value',    'FK', '→ Contractors.contractor_id'),
        col_('D', 'status',       'R',  'ACTIVE or INACTIVE', LIST.MAPPING_STATUS),
        col_('E', 'notes',        'O',  'Platform Owner notes'),
        col_('F', 'created_at',   'S',  'ISO timestamp'),
        col_('G', 'updated_at',   'S',  'ISO timestamp')
      ],
      samples: [
        ['MAP-CTR-001', 'RHI',  'CTR-001', 'ACTIVE', 'Reliance Heavy Industries', ts_(), ts_()],
        ['MAP-CTR-002', 'ASEC', 'CTR-002', 'ACTIVE', 'ASEC plant contractor',     ts_(), ts_()]
      ]
    },
    {
      name: 'Legacy_Status_Mapping',
      colDefs: [
        col_('A', 'mapping_id',   'PK', 'MAP-STS-XXXX'),
        col_('B', 'legacy_value', 'R',  'Legacy status label'),
        col_('C', 'new_value',    'R',  'Target status_code (Status_Dictionary)'),
        col_('D', 'status',       'R',  'ACTIVE or INACTIVE', LIST.MAPPING_STATUS),
        col_('E', 'notes',        'O',  'Platform Owner notes'),
        col_('F', 'created_at',   'S',  'ISO timestamp'),
        col_('G', 'updated_at',   'S',  'ISO timestamp')
      ],
      samples: [
        ['MAP-STS-001', 'Scheduled',   'SCHEDULED',   'ACTIVE', 'Oil change scheduled',       ts_(), ts_()],
        ['MAP-STS-002', 'Done',        'COMPLETED',   'ACTIVE', 'Legacy completed label',     ts_(), ts_()],
        ['MAP-STS-003', 'In Progress', 'IN_PROGRESS', 'ACTIVE', 'Legacy in-progress label',   ts_(), ts_()]
      ]
    },
    {
      name: 'Legacy_Line_Mapping',
      colDefs: [
        col_('A', 'mapping_id',   'PK', 'MAP-LIN-XXXX'),
        col_('B', 'legacy_value', 'R',  'Legacy production line label'),
        col_('C', 'new_value',    'R',  'Target line identifier'),
        col_('D', 'status',       'R',  'ACTIVE or INACTIVE', LIST.MAPPING_STATUS),
        col_('E', 'notes',        'O',  'Platform Owner notes'),
        col_('F', 'created_at',   'S',  'ISO timestamp'),
        col_('G', 'updated_at',   'S',  'ISO timestamp')
      ],
      samples: [
        ['MAP-LIN-001', 'Line 1',      'Line1', 'ACTIVE', 'Normalized line identifier', ts_(), ts_()],
        ['MAP-LIN-002', 'Kiln Line',   'Line1', 'ACTIVE', 'Kiln production line',       ts_(), ts_()],
        ['MAP-LIN-003', 'Raw Mill L2', 'Line2', 'ACTIVE', 'Raw mill line 2',            ts_(), ts_()]
      ]
    }
  ];
}
