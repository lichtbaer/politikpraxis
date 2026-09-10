import { describe, it, expect } from 'vitest';
import ReactEChartsCore from 'echarts-for-react/esm/core';

/**
 * Schutz gegen Form-Änderungen von `echarts-for-react`.
 *
 * 13 Dateien importieren `ReactEChartsCore` als Default aus dem Deep-Pfad
 * `echarts-for-react/esm/core`. Der ESM-Build ist hier bewusst gewählt, nicht `lib/core`:
 * Das Paket (3.0.6) hat keine `exports`-Map, `lib/core` zeigt also direkt auf eine
 * CJS-Datei mit `exports.default`. Vite 8 bündelt Deps mit Rolldown vor, und dessen
 * CJS-Interop exportiert das komplette `module.exports`-Objekt als Default
 * (`export default require_core()`) statt `exports.default` auszupacken. React bekommt
 * dann `{ default: …, __esModule: true }` als Element-Typ und jede Chart-Komponente
 * crasht mit „Element type is invalid". `esm/core.js` ist echtes ESM mit
 * `export default EChartsReactCore` und umgeht den Interop komplett.
 *
 * Alle Chart-Tests mocken diesen Import weg, deshalb dieser Test: er merkt, wenn der
 * Default-Export verschwindet oder der `esm/`-Pfad wegfällt (z. B. wenn ein
 * Major-Release eine `exports`-Map einführt, die Deep-Imports verbietet).
 */
describe('echarts-for-react Interop', () => {
  it('liefert eine renderbare Komponente als Default-Export', () => {
    expect(ReactEChartsCore).toBeTypeOf('function');
  });

  it('ist eine Klassenkomponente mit React-Lifecycle', () => {
    expect(ReactEChartsCore.prototype).toHaveProperty('render');
  });
});
