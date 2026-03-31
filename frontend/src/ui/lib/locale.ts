/**
 * Locale-Hilfsfunktionen für Intl-APIs.
 *
 * Zentralisiert die Zuordnung von i18next-Sprachcodes (z. B. "de") zu
 * BCP-47-Locale-Strings (z. B. "de-DE"), die von Intl.NumberFormat,
 * toLocaleDateString usw. erwartet werden.
 *
 * Erweiterung auf neue Sprachen:
 *   1. Eintrag in MAP ergänzen
 *   2. Backend: VALID_LOCALES + PgEnum-Migration erweitern
 *   3. Übersetzungsdateien unter frontend/public/locales/<lang>/ anlegen
 *   4. RTL-Sprachen (Arabisch, Hebräisch, Farsi, Urdu): werden automatisch
 *      durch App.tsx erkannt — kein weiterer Eingriff nötig.
 */

const MAP: Record<string, string> = {
  de: 'de-DE',
  en: 'en-US',
  tr: 'tr-TR',
  ar: 'ar-SA',
};

/**
 * Gibt den BCP-47-Locale-String für den gegebenen i18next-Sprachcode zurück.
 * Unbekannte Codes werden unverändert durchgereicht (Intl-APIs tolerieren das).
 */
export function toBcp47(lang: string): string {
  return MAP[lang] ?? lang;
}
