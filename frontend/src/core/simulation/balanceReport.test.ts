import { describe, it, expect } from 'vitest';
import { aggregiere, bestimmeVerlustGrund, type SimResult, type VerlustGrund } from './balanceSim';
import { formatVerlustVerteilung, generateBalanceReport } from '../../../scripts/balanceReportCore';
import { createInitialState } from '../state';
import { DEFAULT_CONTENT } from '../../data/defaults/scenarios';
import { SPIELZIEL_ERFOLG_SCHWELLE } from '../spielziel';
import type { GameState, SpielzielErgebnis } from '../types';

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
    einbringenHaengerMax: 0,
    ...overrides,
  };
}

/** Leere Verlustgrund-Zählung (alle Gründe 0), gezielt überschreibbar. */
function counts(overrides: Partial<Record<VerlustGrund, number>> = {}): Record<VerlustGrund, number> {
  return {
    koalitionsbruch: 0,
    partner_kuendigt: 0,
    misstrauensvotum: 0,
    vertrauensfrage: 0,
    ruecktritt: 0,
    kein_gesetz: 0,
    agenda: 0,
    punkte: 0,
    ...overrides,
  };
}

describe('aggregiere — Verlustgrund-Aggregat (Issue #210, #482)', () => {
  it('zählt Verlustgründe und bestimmt den häufigsten', () => {
    const ergebnisse: SimResult[] = [
      simResult({ gewonnen: false, verlustGrund: 'punkte' }),
      simResult({ gewonnen: false, verlustGrund: 'punkte' }),
      simResult({ gewonnen: false, verlustGrund: 'koalitionsbruch' }),
      simResult({ gewonnen: false, verlustGrund: 'partner_kuendigt' }),
      simResult({ gewonnen: false, verlustGrund: 'agenda' }),
      simResult({ gewonnen: true }), // Sieg — kein Verlustgrund
    ];

    const agg = aggregiere(ergebnisse);

    expect(agg.verlustGrund.counts).toEqual(
      counts({ punkte: 2, koalitionsbruch: 1, partner_kuendigt: 1, agenda: 1 }),
    );
    expect(agg.verlustGrund.haeufigster).toBe('punkte');
  });

  it('kennt keinen Grund „unbekannt“ mehr (#482)', () => {
    const agg = aggregiere([simResult({ gewonnen: false, verlustGrund: 'punkte' })]);
    expect(Object.keys(agg.verlustGrund.counts)).not.toContain('unbekannt');
  });

  it('ignoriert gecrashte Runs und liefert null ohne Niederlagen', () => {
    const nurSiege = aggregiere([simResult({ gewonnen: true }), simResult({ gewonnen: true })]);
    expect(nurSiege.verlustGrund.haeufigster).toBeNull();

    const mitCrash = aggregiere([simResult({ crash: true, verlustGrund: 'punkte' })]);
    expect(mitCrash.verlustGrund.counts.punkte).toBe(0);
    expect(mitCrash.verlustGrund.haeufigster).toBeNull();
  });
});

describe('bestimmeVerlustGrund (#482)', () => {
  const spielziel = (over: Partial<SpielzielErgebnis> = {}): SpielzielErgebnis => ({
    gesamtpunkte: SPIELZIEL_ERFOLG_SCHWELLE + 10,
    gesamtnote: 'C',
    bilanzPunkte: 50,
    agendaPunkte: 50,
    urteilPunkte: 50,
    wahlbonus: 0,
    agendaSpielerErfuellt: 2,
    agendaSpielerGesamt: 2,
    agendaKoalitionErfuellt: 0,
    agendaKoalitionGesamt: 0,
    beschlosseneGesetzeUrteil: 3,
    ...over,
  });
  const endState = (over: Partial<GameState>): GameState => ({
    ...createInitialState(DEFAULT_CONTENT, 4),
    gameOver: true,
    ...over,
  });

  it('Sieg: kein Verlustgrund', () => {
    expect(bestimmeVerlustGrund(endState({ spielendeGrund: 'legislatur' }), true, 4)).toBeUndefined();
  });

  it('vorzeitiges Ende: übernimmt den gespeicherten Grund', () => {
    const gruende = ['koalitionsbruch', 'partner_kuendigt', 'misstrauensvotum', 'vertrauensfrage', 'ruecktritt'] as const;
    for (const grund of gruende) {
      expect(bestimmeVerlustGrund(endState({ spielendeGrund: grund }), false, 4)).toBe(grund);
    }
  });

  it('reguläres Legislaturende: verfehlter Teil des Spielziels', () => {
    const legislatur = (sz: SpielzielErgebnis) => endState({ spielendeGrund: 'legislatur', spielziel: sz });
    expect(bestimmeVerlustGrund(legislatur(spielziel({ beschlosseneGesetzeUrteil: 0 })), false, 4)).toBe('kein_gesetz');
    expect(bestimmeVerlustGrund(legislatur(spielziel({ agendaSpielerErfuellt: 1 })), false, 1)).toBe('agenda');
    expect(bestimmeVerlustGrund(legislatur(spielziel({ gesamtpunkte: 10 })), false, 4)).toBe('punkte');
  });

  it('ohne Spielziel oder ohne Grund (Schleife durchgelaufen): Fallback punkte', () => {
    expect(bestimmeVerlustGrund(endState({ spielendeGrund: 'legislatur', spielziel: null }), false, 4)).toBe('punkte');
    expect(bestimmeVerlustGrund(endState({ gameOver: false }), false, 4)).toBe('punkte');
  });
});

describe('formatVerlustVerteilung (#482)', () => {
  it('ohne Niederlagen: Gedankenstrich', () => {
    expect(formatVerlustVerteilung(counts())).toBe('–');
  });

  it('absteigend nach Anzahl, höchstens drei Gründe', () => {
    const zelle = formatVerlustVerteilung(
      counts({ koalitionsbruch: 12, agenda: 5, punkte: 7, misstrauensvotum: 1 }),
    );
    expect(zelle).toBe('Bruch 12 · Punkte 7 · Agenda 5');
  });

  it('bei Gleichstand stabile Reihenfolge der Gründe', () => {
    expect(formatVerlustVerteilung(counts({ punkte: 2, koalitionsbruch: 2 }))).toBe('Bruch 2 · Punkte 2');
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
    // #482: keine heuristischen „unbekannt“-Verluste mehr
    expect(markdown).not.toContain('Unbekannt');

    expect(json.complexities).toEqual([1]);
    expect(json.n).toBe(2);
    expect(json.bloecke).toHaveLength(1);
    expect(json.bloecke[0].rows.length).toBe(json.strategienAnzahl);
    expect(json.bloecke[0].rows[0].ergebnis.verlustGrund).toBeDefined();
  }, 60_000);
});
