/**
 * Minimaler Browser-Globals-Shim für Node-CLI-Läufe (z. B. balanceReport).
 *
 * Teile des Engine-Codes (core/systems/events.ts → i18n.ts) greifen beim
 * Modul-Load auf `localStorage` zu. Im Browser/Vitest (jsdom) ist das vorhanden,
 * unter purem Node nicht. Dieses Modul wird als ERSTER Import gezogen, damit der
 * Shim vor der Auswertung der Engine-Module gesetzt ist.
 */
if (typeof (globalThis as { localStorage?: unknown }).localStorage === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as { localStorage: unknown }).localStorage = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => void store.set(key, String(value)),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
}
