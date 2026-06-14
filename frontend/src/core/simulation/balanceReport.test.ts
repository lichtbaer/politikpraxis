import { describe, it, expect } from 'vitest';
import { aggregiere, type SimResult } from './balanceSim';
import { generateBalanceReport } from '../../../scripts/balanceReportCore';

/** Baut ein minimales SimResult mit Defaults; Felder gezielt überschreibbar. */
function simResult(overrides: Partial<SimResult>): SimResult {
  return {
    gewonnen: false,
    wahlprognose: 40,
    saldo: 0,
    koalition: 50,
    monat: 48,
    gesetze: 0,
    crash: false,
    engineErrors: 0,
    pkEnde: 50,
    pkKnappeMonate: 0,
    pkRegenSumme: 0,
    zfEnde: 50,
    ...overrides,
  };
}

describe('aggregiere — Verlustgrund-Aggregat (Issue #210)', () => {
  it('zählt Verlustgründe und bestimmt den häufigsten', () => {
    const ergebnisse: SimResult[] = [
      simResult({ gewonnen: false, verlustGrund: 'punkte' }),
      simResult({ gewonnen: false, verlustGrund: 'punkte' }),
      simResult({ gewonnen: false, verlustGrund: 'koalitionsbruch' }),
      simResult({ gewonnen: true }), // Sieg — kein Verlustgrund
    ];

    const agg = aggregiere(ergebnisse);

    expect(agg.verlustGrund.counts.punkte).toBe(2);
    expect(agg.verlustGrund.counts.koalitionsbruch).toBe(1);
    expect(agg.verlustGrund.counts.misstrauensvotum).toBe(0);
    expect(agg.verlustGrund.haeufigster).toBe('punkte');
  });

  it('ignoriert gecrashte Runs und liefert null ohne Niederlagen', () => {
    const nurSiege = aggregiere([simResult({ gewonnen: true }), simResult({ gewonnen: true })]);
    expect(nurSiege.verlustGrund.haeufigster).toBeNull();

    const mitCrash = aggregiere([simResult({ crash: true, verlustGrund: 'punkte' })]);
    expect(mitCrash.verlustGrund.counts.punkte).toBe(0);
    expect(mitCrash.verlustGrund.haeufigster).toBeNull();
  });
});

describe('generateBalanceReport — Smoke (Issue #210)', () => {
  it('erzeugt Markdown mit Kopf, Strategien und allen Spalten', () => {
    const { markdown, json } = generateBalanceReport({ n: 2, complexities: [1] });

    expect(markdown).toContain('# Balance-Report');
    expect(markdown).toContain('## Komplexität 1');
    // Spaltenüberschriften
    expect(markdown).toContain('Gewinnrate');
    expect(markdown).toContain('Verlustgrund');
    // mindestens eine bekannte Strategie als Zeile
    expect(markdown).toContain('musterschueler');

    expect(json.complexities).toEqual([1]);
    expect(json.n).toBe(2);
    expect(json.bloecke).toHaveLength(1);
    expect(json.bloecke[0].rows.length).toBe(json.strategienAnzahl);
    expect(json.bloecke[0].rows[0].ergebnis.verlustGrund).toBeDefined();
  }, 60_000);
});
