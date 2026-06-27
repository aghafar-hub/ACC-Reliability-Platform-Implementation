// platform/kernel/src/logger.ts

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

export interface ILogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export interface LoggerOptions {
  minLevel?: LogLevel;
  prefix?: string;
}

export class PlatformLogger implements ILogger {
  private readonly minLevel: LogLevel;
  private readonly prefix: string;

  constructor(options: LoggerOptions = {}) {
    this.minLevel = options.minLevel ?? 'info';
    this.prefix = options.prefix ?? '[ACC-Platform]';
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel];
  }

  private buildEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context !== undefined ? { context } : {}),
    };
  }

  private write(entry: LogEntry): void {
    const base = `${entry.timestamp} ${this.prefix} [${entry.level.toUpperCase()}] ${entry.message}`;
    const output = entry.context !== undefined
      ? `${base} ${JSON.stringify(entry.context)}`
      : base;

    if (entry.level === 'error') {
      console.error(output);
    } else if (entry.level === 'warn') {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      this.write(this.buildEntry('debug', message, context));
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      this.write(this.buildEntry('info', message, context));
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      this.write(this.buildEntry('warn', message, context));
    }
  }

  error(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      this.write(this.buildEntry('error', message, context));
    }
  }
}

/** Singleton default logger for the kernel bootstrap phase. */
export const kernelLogger = new PlatformLogger({ prefix: '[Kernel]' });
