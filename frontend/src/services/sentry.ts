import * as Sentry from '@sentry/react';
import { setLogSink } from '../utils/logger';

/** Initialisiert Sentry, sofern VITE_SENTRY_DSN gesetzt ist. Sonst No-Op. */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
    // Ohne Release lassen sich Issues nicht Deploys zuordnen.
    release: `politikpraxis-frontend@${__APP_VERSION__}`,
    sendDefaultPii: false,
  });

  // logger.error → Sentry-Event, logger.warn → Breadcrumb. Damit erreichen die
  // von safeSystem (core/engine.ts) abgefangenen Engine-Crashes das
  // Error-Tracking, statt nur in der Browser-Konsole zu landen.
  setLogSink((level, message, context) => {
    if (level === 'error') {
      const error = context?.error;
      if (error instanceof Error) {
        Sentry.captureException(error, { extra: { message, ...context } });
      } else {
        Sentry.captureMessage(message, { level: 'error', extra: context });
      }
    } else {
      Sentry.addBreadcrumb({ level: 'warning', message, data: context });
    }
  });
}
