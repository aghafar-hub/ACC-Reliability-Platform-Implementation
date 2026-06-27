// platform/services/src/storage/query-types.ts
// Provider-agnostic query parameter types: filtering, sorting, and paging.
//
// Design constraints:
//  - All types are provider-agnostic. Each storage implementation translates
//    these structures to its native query language (Sheets row predicates,
//    SQL WHERE clauses, in-memory Array.filter, etc.).
//  - FilterExpression is a recursive discriminated union so complex predicates
//    (nested and/or trees) are representable without string interpolation.
//  - PageRequest is 1-based to match UI conventions; implementations translate
//    to 0-based offsets internally.
//  - No implementation logic exists in this file.

// ── Filter operator ───────────────────────────────────────────────────────────

/**
 * Comparison and membership operators for field-level predicates.
 *
 * Providers that do not support a specific operator must throw
 * {@link QueryError} with a clear message rather than silently returning
 * incorrect results.
 *
 *  | Operator     | Applies to         | Notes                                    |
 *  |--------------|--------------------|------------------------------------------|
 *  | `eq`         | any                | strict equality                          |
 *  | `ne`         | any                | strict inequality                        |
 *  | `gt`         | number, date, str  | greater than                             |
 *  | `gte`        | number, date, str  | greater than or equal                    |
 *  | `lt`         | number, date, str  | less than                                |
 *  | `lte`        | number, date, str  | less than or equal                       |
 *  | `contains`   | string             | substring match (case-insensitive)       |
 *  | `startsWith` | string             | prefix match (case-insensitive)          |
 *  | `endsWith`   | string             | suffix match (case-insensitive)          |
 *  | `in`         | any                | value is a member of the supplied array  |
 *  | `notIn`      | any                | value is not a member of the array       |
 *  | `isNull`     | any nullable       | field is null / absent; `value` ignored  |
 *  | `isNotNull`  | any nullable       | field is not null / present              |
 */
export type FilterOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'in'
  | 'notIn'
  | 'isNull'
  | 'isNotNull';

// ── Filter expression ─────────────────────────────────────────────────────────

/**
 * Atomic predicate that tests a single field of entity `T`.
 *
 * - For `isNull` / `isNotNull`, `value` is not required and is ignored.
 * - For `in` / `notIn`, `value` must be a readonly array of comparable items.
 * - For all other operators, `value` must be type-compatible with the field.
 */
export interface FieldFilter<T> {
  readonly kind: 'field';
  /** Entity field to evaluate. `keyof T` enforces compile-time field safety. */
  readonly field: keyof T;
  readonly operator: FilterOperator;
  /**
   * Comparison value.  Optional for `isNull` / `isNotNull`;
   * required for all other operators.
   */
  readonly value?: unknown;
}

/**
 * Logical composition of multiple child {@link FilterExpression} predicates.
 *
 *  - `logic: 'and'` — all children must be satisfied.
 *  - `logic: 'or'`  — at least one child must be satisfied.
 *
 * Nesting is allowed to express arbitrarily complex predicate trees.
 */
export interface CompositeFilter<T> {
  readonly kind: 'composite';
  readonly logic: 'and' | 'or';
  /** Child predicates.  An empty array is treated as "match nothing" for `and`
   *  and "match everything" for `or`. */
  readonly filters: readonly FilterExpression<T>[];
}

/**
 * Provider-agnostic query predicate for entity type `T`.
 *
 * Use {@link FieldFilter} for single-field tests and {@link CompositeFilter}
 * to combine multiple predicates with `and` / `or` logic.
 *
 * @example
 * // Find active equipment with voltage > 400
 * const filter: FilterExpression<Equipment> = {
 *   kind: 'composite',
 *   logic: 'and',
 *   filters: [
 *     { kind: 'field', field: 'isActive', operator: 'eq', value: true },
 *     { kind: 'field', field: 'voltage',  operator: 'gt', value: 400 },
 *   ],
 * };
 */
export type FilterExpression<T> = FieldFilter<T> | CompositeFilter<T>;

// ── Sort ──────────────────────────────────────────────────────────────────────

/** Direction applied to a sort term. */
export type SortDirection = 'asc' | 'desc';

/**
 * A single sort term.
 *
 * When multiple `SortClause` entries are provided, they form a compound sort
 * key; earlier entries take precedence over later ones.
 */
export interface SortClause<T> {
  /** Entity field to sort by. `keyof T` enforces compile-time field safety. */
  readonly field: keyof T;
  readonly direction: SortDirection;
}

// ── Paging ────────────────────────────────────────────────────────────────────

/**
 * Caller-supplied pagination parameters.
 *
 * `page` is 1-based (the first page is page 1).  Implementations translate
 * to 0-based offsets internally using:
 *   `offset = (page - 1) * pageSize`
 *
 * `pageSize` must be a positive integer.  Implementations may cap the maximum
 * page size; exceeding the cap throws {@link QueryError}.
 */
export interface PageRequest {
  /** 1-based page number.  Must be ≥ 1. */
  readonly page: number;
  /** Maximum number of items to return.  Must be ≥ 1. */
  readonly pageSize: number;
}

/**
 * Paginated result returned by {@link IRepository.findPaged}.
 *
 * Contains the requested slice of items plus enough metadata for callers to
 * implement pagination controls without issuing a separate count query.
 */
export interface PageResult<T> {
  /** Items in the current page, in the requested sort order. */
  readonly items: readonly T[];
  /** Total number of entities matching the query across all pages. */
  readonly totalCount: number;
  /** 1-based page number that was returned. */
  readonly page: number;
  /** Page size used to produce this result. */
  readonly pageSize: number;
  /** Total number of pages: `Math.ceil(totalCount / pageSize)`. */
  readonly totalPages: number;
  /** `true` when a subsequent page exists (`page < totalPages`). */
  readonly hasNextPage: boolean;
  /** `true` when a prior page exists (`page > 1`). */
  readonly hasPreviousPage: boolean;
}

// ── QueryOptions ──────────────────────────────────────────────────────────────

/**
 * Combined query parameters accepted by all {@link IRepository} read methods.
 *
 * All fields are optional.  Omitting `filter` returns all records.  Omitting
 * `sort` returns records in an implementation-defined order.  Omitting `page`
 * returns the full (unsliced) result set.
 *
 * Execution order: `filter` → `sort` → `page`.
 */
export interface QueryOptions<T> {
  /** Predicate that restricts which entities are returned. */
  readonly filter?: FilterExpression<T>;
  /**
   * Ordered sort terms.  Applied after filtering and before paging.
   * Earlier entries take precedence over later entries.
   */
  readonly sort?: readonly SortClause<T>[];
  /**
   * Pagination slice.  When omitted, all matching entities are returned.
   * Prefer {@link IRepository.findPaged} when pagination metadata is also
   * needed.
   */
  readonly page?: PageRequest;
}

/**
 * {@link QueryOptions} with a required `page` field.
 *
 * Passed to {@link IRepository.findPaged} to guarantee that paging parameters
 * are always present when a {@link PageResult} is expected.
 */
export interface PagedQueryOptions<T> extends QueryOptions<T> {
  readonly page: PageRequest;
}
