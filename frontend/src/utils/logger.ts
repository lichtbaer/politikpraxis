/**
 * Strukturiertes Logging-Utility für das Frontend.
 * Im Development-Modus werden alle Level ausgegeben.
 * Im Production-Modus werden debug-Logs unterdrückt.
 */

type Level = 'debug' | 'info' | 'warn' | 'error';

const isDev = import.meta.env.DEV;

function log(level: Level, message: string, context?: Record<string, unknown>): void {
  if (!isDev && level === 'debug') return;

  const prefix = `[${level.toUpperCase()}] ${message}`;
  if (context !== undefined) {
    console[level === 'debug' ? 'log' : level](prefix, context);
  } else {
    console[level === 'debug' ? 'log' : level](prefix);
  }
  // Future: send to error tracking service (e.g. Sentry) here
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, unknown>) => log('debug', msg, ctx),
  info: (msg: string, ctx?: Record<string, unknown>) => log('info', msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => log('warn', msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => log('error', msg, ctx),
};
