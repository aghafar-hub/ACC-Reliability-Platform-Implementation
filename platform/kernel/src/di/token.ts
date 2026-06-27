// platform/kernel/src/di/token.ts
//
// A Token<T> is a typed, name-keyed handle for a dependency.
//
// The generic parameter T is a phantom type — it exists only at compile time
// to give resolve<T>(token) its return type without requiring decorators or
// runtime type information (no reflect-metadata needed).
//
// Usage:
//   export const LOGGER_TOKEN   = new Token<ILogger>('platform.logger');
//   export const CONFIG_TOKEN   = new Token<AppConfig>('platform.config');
//
//   container.registerSingleton(LOGGER_TOKEN, logger);
//   const logger = container.resolve(LOGGER_TOKEN); // typed as ILogger

/**
 * Typed dependency token.
 *
 * Two Token instances with the same name refer to the same dependency slot
 * in the container — register with one, resolve with another, and it works.
 * Use a single exported constant per dependency to avoid accidental naming
 * mismatches.
 */
export class Token<T> {
  /** Human-readable name for error messages and diagnostics. */
  readonly name: string;

  constructor(name: string) {
    if (!name || name.trim() === '') {
      throw new Error('Token name must not be empty.');
    }
    this.name = name;
  }

  toString(): string {
    return `Token(${this.name})`;
  }
}

// T is an intentionally phantom type parameter (used only at compile time).
// ESLint rule @typescript-eslint/no-unused-vars does not apply to class generics.
