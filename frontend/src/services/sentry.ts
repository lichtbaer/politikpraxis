import * as Sentry from '@sentry/react';

/** Initialisiert Sentry, sofern VITE_SENTRY_DSN gesetzt ist. Sonst No-Op. */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,
    sendDefaultPii: false,
  });
}
