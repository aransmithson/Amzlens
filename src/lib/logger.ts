/**
 * @file logger.ts
 * @description Dedicated structured logger ensuring standard logging output format and telemetry hooks without relying on bare console calls.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogPayload {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: unknown;
}

/**
 * Formats and dispatches structured log messages.
 * We separate formatting from environment output to enable easy redirection to monitoring sinks (e.g. Datadog, Sentry) in production.
 *
 * @param {LogLevel} level - Severity level of the log entry.
 * @param {string} context - Namespace or module initiating the log.
 * @param {string} message - Descriptive log message.
 * @param {unknown} [data] - Optional metadata or error objects.
 */
function log(level: LogLevel, context: string, message: string, data?: unknown): void {
  const payload: LogPayload = {
    timestamp: new Date().toISOString(),
    level,
    context,
    message,
    data,
  };

  const formattedPrefix = `[${payload.timestamp}] [${level.toUpperCase()}] [${context}]:`;

  if (level === 'error') {
    // Forward to error stream to preserve standard stderr reporting in server runtimes
    process.stderr?.write
      ? process.stderr.write(`${formattedPrefix} ${message} ${data ? JSON.stringify(data) : ''}\n`)
      : void 0;
  } else {
    // Keep server stdout clean and formatted
    process.stdout?.write
      ? process.stdout.write(`${formattedPrefix} ${message} ${data ? JSON.stringify(data) : ''}\n`)
      : void 0;
  }
}

export const logger = {
  /**
   * Logs informational milestones such as API connections or scan detections.
   */
  info: (context: string, message: string, data?: unknown): void => log('info', context, message, data),

  /**
   * Logs recoverable warnings such as barcode lookup misses or fallback engagements.
   */
  warn: (context: string, message: string, data?: unknown): void => log('warn', context, message, data),

  /**
   * Logs unhandled exceptions or rejected promises with stack traces.
   */
  error: (context: string, message: string, data?: unknown): void => log('error', context, message, data),

  /**
   * Logs low-level debugging details during barcode detection frame passes.
   */
  debug: (context: string, message: string, data?: unknown): void => log('debug', context, message, data),
};
