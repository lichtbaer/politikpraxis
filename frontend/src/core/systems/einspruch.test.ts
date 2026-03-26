import { describe, it, expect } from 'vitest';
import {
  isEinspruchsgesetz,
  executeBundesratVote,
  ueberstimmeBReinspruch,
} from './bundesrat';
import type { GameState, BundesratFraktion, Law } from '../types';
import { createInitialState } from '../state';
import { DEFAULT_CONTENT } from '../../data/defaults/scenarios';

function makeState(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialState(DEFAULT_CONTENT, 4);
  return { ...base, pk: 50, month: 10, ...overrides };
}

function makeFraktion(overrides: Partial<BundesratFraktion> = {}): BundesratFraktion {
  return {
    id: 'koalitionstreue',
    name: 'Koalitionstreue',
    sprecher: { name: 'Sprecher', partei: 'P', land: 'NW', initials: 'SP', color: '#000', bio: 'bio' },
    laender: ['NW', 'BW', 'NI', 'HH', 'HB'],
    basisBereitschaft: 45,
    beziehung: 50,
    tradeoffPool: [{ id: 't1', label: 'T1', desc: 'D', effect: { hh: -0.1 }, charMood: {} }],
    ...overrides,
  };
}

function makeLaw(overrides: Partial<Law> = {}): Law {
  return {
    id: 'test_law',
    titel: 'Test',
    kurz: 'TL',
    desc: '',
    tags: ['bund', 'land'],
    status: 'bt_passed',
    ja: 55,
    nein: 45,
    effekte: { hh: -0.2 },
    lag: 4,
    expanded: false,
    route: null,
    rprog: 0,
    rdur: 0,
    blockiert: null,
    ...overrides,
  };
}

describe('isEinspruchsgesetz', () => {
  it('gibt true zurück wenn zustimmungspflichtig === false', () => {
    expect(isEinspruchsgesetz({ zustimmungspflichtig: false })).toBe(true);
  });

  it('gibt false zurück wenn zustimmungspflichtig === true', () => {
    expect(isEinspruchsgesetz({ zustimmungspflichtig: true })).toBe(false);
  });

  it('gibt false zurück wenn zustimmungspflichtig nicht gesetzt (Default = Zustimmungsgesetz)', () => {
    expect(isEinspruchsgesetz({})).toBe(false);
  });
});

describe('executeBundesratVote — Einspruch vs. Zustimmung', () => {
  // Blockade-Szenario: alle Fraktionen lehnen ab (niedrige Bereitschaft)
  const lowFraktionen: BundesratFraktion[] = [
    makeFraktion({ id: 'koalitionstreue', basisBereitschaft: 10, laender: ['NW', 'NI', 'HH', 'HB', 'SH'] }),
    makeFraktion({ id: 'pragmatische_mitte', basisBereitschaft: 10, laender: ['RP', 'SL', 'BE', 'HE', 'TH', 'SN'] }),
    makeFraktion({ id: 'konservativer_block', basisBereitschaft: 10, laender: ['BY', 'BW', 'ST'] }),
    makeFraktion({ id: 'ostblock', basisBereitschaft: 10, laender: ['BB', 'MV'] }),
  ];

  it('Zustimmungsgesetz: Blockade setzt status auf blockiert', () => {
    const law = makeLaw({ zustimmungspflichtig: true });
    const state = makeState({
      gesetze: [law],
      bundesratFraktionen: lowFraktionen,
    });
    const result = executeBundesratVote(state, 'test_law', { milieus: [], complexity: 4 });
    const resultLaw = result.gesetze.find(g => g.id === 'test_law');
    expect(resultLaw?.status).toBe('blockiert');
    expect(resultLaw?.blockiert).toBe('bundesrat');
  });

  it('Einspruchsgesetz: Blockade setzt status auf br_einspruch', () => {
    const law = makeLaw({ zustimmungspflichtig: false });
    const state = makeState({
      gesetze: [law],
      bundesratFraktionen: lowFraktionen,
    });
    const result = executeBundesratVote(state, 'test_law', { milieus: [], complexity: 4 });
    const resultLaw = result.gesetze.find(g => g.id === 'test_law');
    expect(resultLaw?.status).toBe('br_einspruch');
    expect(resultLaw?.brEinspruchEingelegt).toBe(true);
  });

  it('Einspruch nur aktiv bei Feature einspruch_vs_zustimmung (Stufe 2+)', () => {
    const law = makeLaw({ zustimmungspflichtig: false });
    const state = makeState({
      gesetze: [law],
      bundesratFraktionen: lowFraktionen,
    });
    // Stufe 1: Feature nicht aktiv → blockiert statt br_einspruch
    const result = executeBundesratVote(state, 'test_law', { milieus: [], complexity: 1 });
    const resultLaw = result.gesetze.find(g => g.id === 'test_law');
    expect(resultLaw?.status).toBe('blockiert');
  });

  it('Mehrheit im Bundesrat → beschlossen (egal ob Einspruch oder Zustimmung)', () => {
    const highFraktionen: BundesratFraktion[] = [
      makeFraktion({ id: 'koalitionstreue', basisBereitschaft: 90, laender: ['NW', 'NI', 'HH', 'HB', 'SH'] }),
      makeFraktion({ id: 'pragmatische_mitte', basisBereitschaft: 90, laender: ['RP', 'SL', 'BE', 'HE', 'TH', 'SN'] }),
      makeFraktion({ id: 'konservativer_block', basisBereitschaft: 10, laender: ['BY', 'BW', 'ST'] }),
      makeFraktion({ id: 'ostblock', basisBereitschaft: 10, laender: ['BB', 'MV'] }),
    ];
    const law = makeLaw({ zustimmungspflichtig: false });
    const state = makeState({
      gesetze: [law],
      bundesratFraktionen: highFraktionen,
    });
    const result = executeBundesratVote(state, 'test_law', { milieus: [], complexity: 4 });
    const resultLaw = result.gesetze.find(g => g.id === 'test_law');
    expect(resultLaw?.status).toBe('beschlossen');
  });
});

describe('ueberstimmeBReinspruch', () => {
  it('überstimmt bei br_einspruch + ausreichend PK + ja > 50%', () => {
    const law = makeLaw({ status: 'br_einspruch', ja: 55, zustimmungspflichtig: false });
    const state = makeState({
      gesetze: [law],
      pk: 30,
    });
    const result = ueberstimmeBReinspruch(state, 'test_law');
    const resultLaw = result.gesetze.find(g => g.id === 'test_law');
    expect(resultLaw?.status).toBe('beschlossen');
    expect(result.pk).toBe(30 - 15); // EINSPRUCH_UEBERSTIMMUNG_PK
  });

  it('scheitert bei ja <= 50%', () => {
    const law = makeLaw({ status: 'br_einspruch', ja: 48, zustimmungspflichtig: false });
    const state = makeState({
      gesetze: [law],
      pk: 30,
    });
    const result = ueberstimmeBReinspruch(state, 'test_law');
    const resultLaw = result.gesetze.find(g => g.id === 'test_law');
    expect(resultLaw?.status).toBe('br_einspruch'); // unchanged
    expect(result.pk).toBe(30); // PK not deducted
  });

  it('scheitert bei zu wenig PK', () => {
    const law = makeLaw({ status: 'br_einspruch', ja: 55, zustimmungspflichtig: false });
    const state = makeState({
      gesetze: [law],
      pk: 5,
    });
    const result = ueberstimmeBReinspruch(state, 'test_law');
    expect(result.pk).toBe(5); // unchanged
  });

  it('nur bei br_einspruch status (nicht bei blockiert)', () => {
    const law = makeLaw({ status: 'blockiert', ja: 55, blockiert: 'bundesrat' });
    const state = makeState({
      gesetze: [law],
      pk: 30,
    });
    const result = ueberstimmeBReinspruch(state, 'test_law');
    expect(result).toBe(state); // unchanged
  });
});
