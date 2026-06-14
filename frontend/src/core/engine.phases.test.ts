import { describe, it, expect, vi } from 'vitest';
import {
  tick,
  phasePreTick,
  phasePolicyAndLegislation,
  phaseEconomyAndBudget,
  phaseActorsAndInstitutions,
  phasePublicAndMedia,
  phaseElectionAndGameEnd,
  phaseHistoryAndDiagnostics,
  type TickContext,
} from './engine';
import { makeState } from './test-helpers';
import { DEFAULT_CONTENT } from '../data/defaults/scenarios';
import type { ContentBundle, GameState } from './types';

/**
 * Baut einen frischen TickContext analog zu tick() — für isolierte Phasen-Tests.
 * Da TickContext modulintern ist, rekonstruieren wir die öffentlich sichtbare
 * Form über das exportierte Typ-Alias.
 */
function makeCtx(state: GameState, content: ContentBundle, complexity = 4): TickContext {
  return {
    s: { ...state, month: state.month + 1, kpiPrev: { ...state.kpi }, tickLog: [] },
    content,
    complexity,
    ausrichtung: { wirtschaft: 0, gesellschaft: 0, staat: 0 },
    originalState: state,
    t0: 0,
    tickLog: [],
    failedSystems: undefined,
    phase: 'test',
  };
}

const ALL_PHASES = [
  ['phasePreTick', phasePreTick],
  ['phasePolicyAndLegislation', phasePolicyAndLegislation],
  ['phaseEconomyAndBudget', phaseEconomyAndBudget],
  ['phaseActorsAndInstitutions', phaseActorsAndInstitutions],
  ['phasePublicAndMedia', phasePublicAndMedia],
  ['phaseElectionAndGameEnd', phaseElectionAndGameEnd],
  ['phaseHistoryAndDiagnostics', phaseHistoryAndDiagnostics],
] as const;

describe('Engine-Phasen — Smoke', () => {
  it.each(ALL_PHASES)('Phase %s wirft nicht und liefert gültigen State', (_name, phaseFn) => {
    const ctx = makeCtx(makeState({ month: 5, rngSeed: 7 }), DEFAULT_CONTENT);
    expect(() => phaseFn(ctx)).not.toThrow();
    expect(ctx.s).toBeTruthy();
    expect(typeof ctx.s.month).toBe('number');
  });

  it.each(ALL_PHASES)('Phase %s ist robust gegen leeren Content', (_name, phaseFn) => {
    const ctx = makeCtx(makeState({ month: 5 }), {} as unknown as ContentBundle);
    expect(() => phaseFn(ctx)).not.toThrow();
  });
});

/**
 * Content, dessen `verbaende`-Zugriff deterministisch wirft. `content.verbaende`
 * wird ausschließlich innerhalb safeSystem-gewrappter Aufrufe in
 * phaseActorsAndInstitutions gelesen → die Exception wird gefangen, nicht
 * weitergereicht.
 */
function contentThatThrowsOnVerbaende(): ContentBundle {
  return {
    get verbaende(): never {
      throw new Error('boom (test)');
    },
  } as unknown as ContentBundle;
}

describe('Engine-Phasen — safeSystem trägt Systemname und Phase', () => {
  it('fängt Fehler eines gewrappten Systems, protokolliert die Phase und sammelt failedSystems', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const ctx = makeCtx(makeState({ month: 5 }), contentThatThrowsOnVerbaende());
      ctx.phase = 'phaseActorsAndInstitutions';
      expect(() => phaseActorsAndInstitutions(ctx)).not.toThrow();

      expect(ctx.failedSystems?.length).toBeGreaterThan(0);
      // failedSystems enthält jetzt Objekte mit name und phase
      expect(ctx.failedSystems?.[0]).toMatchObject({
        name: expect.any(String),
        phase: 'phaseActorsAndInstitutions',
      });
      // Der Fehler-Log nennt sowohl ein System als auch die Phase.
      const loggedWithPhase = errorSpy.mock.calls.some(
        ([msg, meta]) =>
          typeof msg === 'string' &&
          msg.includes('phase "phaseActorsAndInstitutions"') &&
          (meta as { phase?: string } | undefined)?.phase === 'phaseActorsAndInstitutions',
      );
      expect(loggedWithPhase).toBe(true);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('tick() bleibt stabil bei System-Fehler und hängt Engine-Fehler ins tickLog', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const result = tick(makeState({ month: 5 }), contentThatThrowsOnVerbaende(), 4);
      expect(result.month).toBe(6);
      expect(Array.isArray(result.tickLog)).toBe(true);
      // Engine-Fehler landen jetzt in engineDiagnostics, nicht mehr als Null-Delta im tickLog
      expect(result.engineDiagnostics?.length).toBeGreaterThan(0);
      expect(result.engineDiagnostics?.[0]).toMatchObject({
        phase: expect.any(String),
        system: expect.any(String),
        level: 'error',
      });
    } finally {
      errorSpy.mockRestore();
    }
  });
});

/**
 * Golden-Regressionstest: festgehaltene Werte eines 24-Monats-Laufs mit festem
 * Seed, aufgenommen vom monolithischen Engine VOR dem Phasen-Refactor (Issue
 * #207). Beweist, dass die fachliche Reihenfolge der Systeme unverändert ist.
 */
const GOLDEN_24 = [
  { month: 2, kpi: { al: 5.8, hh: 0, gi: 32, zf: 57.75 }, zustG: 48, pk: 94, medienKlima: 54 },
  { month: 3, kpi: { al: 5.8, hh: -0.01, gi: 32, zf: 57.41 }, zustG: 47, pk: 97, medienKlima: 54 },
  { month: 4, kpi: { al: 5.8, hh: -0.06, gi: 32, zf: 57.16 }, zustG: 47, pk: 100, medienKlima: 54 },
  { month: 5, kpi: { al: 5.8, hh: -0.06, gi: 32, zf: 56.91 }, zustG: 47, pk: 103, medienKlima: 53 },
  { month: 6, kpi: { al: 5.8, hh: -0.06, gi: 32, zf: 56.66 }, zustG: 47, pk: 106, medienKlima: 53 },
  { month: 7, kpi: { al: 5.8, hh: -0.06, gi: 32, zf: 56.41 }, zustG: 47, pk: 109, medienKlima: 47 },
  { month: 8, kpi: { al: 5.73, hh: -0.05, gi: 32, zf: 56.05 }, zustG: 47, pk: 112, medienKlima: 47 },
  { month: 9, kpi: { al: 5.73, hh: -0.05, gi: 32, zf: 55.8 }, zustG: 47, pk: 115, medienKlima: 47 },
  { month: 10, kpi: { al: 5.8, hh: -0.08, gi: 32, zf: 55.55 }, zustG: 47, pk: 118, medienKlima: 46 },
  { month: 11, kpi: { al: 5.8, hh: -0.14, gi: 32, zf: 55.3 }, zustG: 47, pk: 121, medienKlima: 46 },
  { month: 12, kpi: { al: 5.8, hh: -0.14, gi: 32.05, zf: 55.05 }, zustG: 47, pk: 124, medienKlima: 46 },
  { month: 13, kpi: { al: 5.8, hh: -0.1, gi: 32.05, zf: 54.81 }, zustG: 46, pk: 127, medienKlima: 46 },
  { month: 14, kpi: { al: 5.73, hh: -0.1, gi: 32.05, zf: 54.56 }, zustG: 46, pk: 130, medienKlima: 45 },
  { month: 15, kpi: { al: 5.73, hh: -0.1, gi: 32.05, zf: 54.31 }, zustG: 46, pk: 133, medienKlima: 45 },
  { month: 16, kpi: { al: 5.83, hh: -0.09, gi: 32.05, zf: 54.06 }, zustG: 46, pk: 136, medienKlima: 45 },
  { month: 17, kpi: { al: 5.83, hh: -0.17, gi: 32.05, zf: 53.81 }, zustG: 45, pk: 139, medienKlima: 45 },
  { month: 18, kpi: { al: 5.68, hh: -0.17, gi: 32.09, zf: 53.56 }, zustG: 45, pk: 142, medienKlima: 45 },
  { month: 19, kpi: { al: 5.68, hh: -0.17, gi: 32.09, zf: 53.31 }, zustG: 45, pk: 145, medienKlima: 45 },
  { month: 20, kpi: { al: 5.68, hh: -0.17, gi: 32.09, zf: 53.06 }, zustG: 45, pk: 148, medienKlima: 45 },
  { month: 21, kpi: { al: 5.68, hh: -0.17, gi: 32.09, zf: 52.84 }, zustG: 45, pk: 150, medienKlima: 45 },
  { month: 22, kpi: { al: 5.56, hh: -0.09, gi: 32.09, zf: 52.59 }, zustG: 45, pk: 150, medienKlima: 45 },
  { month: 23, kpi: { al: 5.39, hh: -0.05, gi: 32.09, zf: 52.23 }, zustG: 45, pk: 150, medienKlima: 45 },
  { month: 24, kpi: { al: 5.27, hh: -0.05, gi: 32.09, zf: 51.98 }, zustG: 45, pk: 150, medienKlima: 45 },
  { month: 25, kpi: { al: 5.27, hh: -0.05, gi: 32.09, zf: 51.73 }, zustG: 45, pk: 150, medienKlima: 45 },
];

describe('Engine-Phasen — Golden-Regression (Reihenfolge unverändert)', () => {
  it('reproduziert den 24-Monats-Lauf bitgenau (Seed 42)', () => {
    let s = makeState({ month: 1, rngSeed: 42 });
    const ausrichtung = { wirtschaft: 0, gesellschaft: 0, staat: 0 };
    for (let i = 0; i < GOLDEN_24.length; i++) {
      s = tick(s, DEFAULT_CONTENT, 4, ausrichtung);
      const exp = GOLDEN_24[i];
      expect(s.month).toBe(exp.month);
      expect(s.kpi).toMatchObject(exp.kpi);
      expect(s.zust.g).toBe(exp.zustG);
      expect(s.pk).toBe(exp.pk);
      expect(s.medienKlima).toBe(exp.medienKlima);
      expect(s.gameOver).toBeFalsy();
    }
  });
});
