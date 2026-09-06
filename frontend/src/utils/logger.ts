/**
 * Strukturiertes Logging-Utility für das Frontend.
 * Im Development-Modus werden alle Level ausgegeben.
 * Im Production-Modus werden debug-Logs unterdrückt.
 */

type Level = 'debug' | 'info' | 'warn' | 'error';

const isDev = import.meta.env?.DEV;

export type LogSink = (level: Level, message: string, context?: Record<string, unknown>) => void;

/**
 * Optionaler Sink für Error-Tracking (Sentry). Wird von services/sentry.ts
 * registriert; der Logger selbst bleibt frei von SDK-Abhängigkeiten, damit
 * core/ ihn ohne Browser-/Sentry-Kopplung nutzen kann.
 */
let sink: LogSink | null = null;

export function setLogSink(fn: LogSink | null): void {
  sink = fn;
}

function log(level: Level, message: string, context?: Record<string, unknown>): void {
  if (!isDev && level === 'debug') return;

  const prefix = `[${level.toUpperCase()}] ${message}`;
  if (context !== undefined) {
    console[level === 'debug' ? 'log' : level](prefix, context);
  } else {
    console[level === 'debug' ? 'log' : level](prefix);
  }
  if (sink && (level === 'warn' || level === 'error')) {
    try {
      sink(level, message, context);
    } catch {
      // Ein defekter Sink darf das Logging nicht zum Absturz bringen.
    }
  }
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, unknown>) => log('debug', msg, ctx),
  info: (msg: string, ctx?: Record<string, unknown>) => log('info', msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => log('warn', msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => log('error', msg, ctx),
};
