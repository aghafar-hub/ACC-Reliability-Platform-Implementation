// platform/storage/src/adapters/google-sheets-adapter.ts
// Google Sheets adapter interface and stub for the ACC Reliability Platform.
//
// The adapter sits between the IStorageProvider abstraction and the raw
// Google Sheets API.  It handles only sheet-level I/O (read rows, append row,
// update row, delete row) and knows nothing about entity types, contractor
// scope, or query filtering.  Those concerns belong to the provider layer.
//
// Current status: STUB — no real implementation.
// The stub throws a descriptive error on every method call so callers
// discover missing implementations at runtime rather than silently
// receiving empty data.

// ── Raw sheet data types ──────────────────────────────────────────────────────

/**
 * Raw result from reading a Google Sheet tab.
 *
 *  - `headers` — column names from the first row of the sheet.
 *  - `rows`    — subsequent rows; each inner array aligns with `headers` by
 *                index.  Empty cells are represented as empty strings.
 */
export interface GoogleSheetsReadResult {
  /** Column names from the header row (row 1). */
  readonly headers: readonly string[];
  /**
   * Data rows (rows 2+).  Each row is a string array aligned with `headers`.
   * Trailing empty cells may be omitted by the Sheets API; implementations
   * must pad short rows to `headers.length` before returning.
   */
  readonly rows: readonly (readonly string[])[];
}

// ── Adapter interface ─────────────────────────────────────────────────────────

/**
 * Low-level Google Sheets I/O adapter.
 *
 * This interface is the only place in the platform that knows about Google
 * Sheets-specific concepts (spreadsheet IDs, sheet names, row indices).
 * All higher-level storage logic (filtering, sorting, contractor scoping)
 * operates on the abstract `IStorageProvider` / `IRepository<T>` interfaces
 * and must not reference this adapter directly.
 *
 * Lifecycle:
 *  1. Instantiate with the spreadsheet ID and credentials.
 *  2. Call {@link connect} once during platform bootstrap.
 *  3. Use {@link readSheet}, {@link appendRow}, {@link updateRow},
 *     {@link deleteRow} during normal operation.
 *  4. Call {@link disconnect} during platform shutdown.
 *
 * Row indices:
 *  - All `rowIndex` parameters are **1-based** and refer to the data row
 *    position (row 1 = first data row, after the header row).
 *  - Implementations translate to the Sheets API's 1-based row numbers
 *    by adding 1 to account for the header row.
 */
export interface IGoogleSheetsAdapter {
  /** `true` after a successful {@link connect} call and before {@link disconnect}. */
  readonly isConnected: boolean;

  /**
   * Authenticates with the Google Sheets API and verifies access to the
   * configured spreadsheet.
   *
   * Safe to call multiple times; subsequent calls when already connected
   * are no-ops.
   *
   * @throws {Error} if credentials are invalid or the spreadsheet is
   *   inaccessible.
   */
  connect(): Promise<void>;

  /**
   * Releases the API connection and any cached credentials.
   *
   * Safe to call when not connected.
   */
  disconnect(): Promise<void>;

  /**
   * Reads all rows from the named sheet tab.
   *
   * @param sheetName Exact name of the sheet tab (case-sensitive).
   * @returns Raw read result containing the header row and all data rows.
   * @throws {Error} if the sheet does not exist or the request fails.
   */
  readSheet(sheetName: string): Promise<GoogleSheetsReadResult>;

  /**
   * Appends a new row at the end of the named sheet tab.
   *
   * @param sheetName Exact name of the sheet tab.
   * @param values    Cell values in header-column order.  Must not include
   *                  the header row itself.
   * @returns 1-based index of the newly appended data row.
   * @throws {Error} if the request fails.
   */
  appendRow(sheetName: string, values: readonly string[]): Promise<number>;

  /**
   * Overwrites a specific data row in the named sheet tab.
   *
   * @param sheetName Exact name of the sheet tab.
   * @param rowIndex  1-based data row index to overwrite (1 = first data row).
   * @param values    New cell values in header-column order.
   * @throws {Error} if the row does not exist or the request fails.
   */
  updateRow(
    sheetName: string,
    rowIndex: number,
    values: readonly string[],
  ): Promise<void>;

  /**
   * Deletes a specific data row from the named sheet tab.
   *
   * Rows below the deleted row shift up by one.  Callers that cache row
   * indices must invalidate their cache after a delete.
   *
   * @param sheetName Exact name of the sheet tab.
   * @param rowIndex  1-based data row index to delete.
   * @throws {Error} if the row does not exist or the request fails.
   */
  deleteRow(sheetName: string, rowIndex: number): Promise<void>;

  /**
   * Performs a lightweight read probe to verify connectivity.
   *
   * Must never throw; all failure conditions are represented in the
   * returned object so the health service can consume this safely.
   *
   * @returns `{ healthy: true }` on success or `{ healthy: false, reason }`.
   */
  healthCheck(): Promise<{ healthy: boolean; reason?: string }>;
}

// ── Stub implementation ───────────────────────────────────────────────────────

/**
 * Stub implementation of {@link IGoogleSheetsAdapter}.
 *
 * Every method throws a descriptive `Error` to make missing implementations
 * immediately visible at runtime.  Replace this stub with a real
 * implementation backed by the Google Sheets REST API or Apps Script bridge
 * when the storage backend is wired up (Phase 6 implementation).
 *
 * Do not rely on this stub in production code.
 */
export class GoogleSheetsAdapterStub implements IGoogleSheetsAdapter {
  readonly isConnected: boolean = false;

  connect(): Promise<void> {
    throw new Error('GoogleSheetsAdapterStub: connect() is not implemented');
  }

  disconnect(): Promise<void> {
    throw new Error('GoogleSheetsAdapterStub: disconnect() is not implemented');
  }

  readSheet(_sheetName: string): Promise<GoogleSheetsReadResult> {
    throw new Error('GoogleSheetsAdapterStub: readSheet() is not implemented');
  }

  appendRow(_sheetName: string, _values: readonly string[]): Promise<number> {
    throw new Error('GoogleSheetsAdapterStub: appendRow() is not implemented');
  }

  updateRow(
    _sheetName: string,
    _rowIndex: number,
    _values: readonly string[],
  ): Promise<void> {
    throw new Error('GoogleSheetsAdapterStub: updateRow() is not implemented');
  }

  deleteRow(_sheetName: string, _rowIndex: number): Promise<void> {
    throw new Error('GoogleSheetsAdapterStub: deleteRow() is not implemented');
  }

  healthCheck(): Promise<{ healthy: boolean; reason?: string }> {
    return Promise.resolve({
      healthy: false,
      reason: 'GoogleSheetsAdapterStub: not implemented',
    });
  }
}
