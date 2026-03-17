import { describe, it, expect } from 'vitest';
import {
  isLobbyingActive,
  calcBundesratMehrheit,
  calcBundesratMehrheitSimple,
  getAggregierteZustimmung,
  getBundesratVoteDetails,
  getBundesratAbstimmungsFelder,
  lobbyFraktion,
  lobbyLand,
  checkKohlSabotage,
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
    tags: ['land'],
    status: 'bt_passed',
    ja: 55,
    nein: 45,
    effekte: {},
    lag: 3,
    expanded: false,
    route: null,
    rprog: 0,
    rdur: 0,
    blockiert: null,
    brVoteMonth: 13,
    ...overrides,
  };
}

describe('isLobbyingActive', () => {
  it('gibt true wenn 1-3 Monate vor brVoteMonth', () => {
    const state = makeState({
      month: 11,
      gesetze: [makeLaw({ brVoteMonth: 13 })],
    });
    expect(isLobbyingActive(state, 'test_law')).toBe(true);
  });

  it('gibt false wenn kein brVoteMonth gesetzt', () => {
    const state = makeState({
      gesetze: [makeLaw({ brVoteMonth: undefined })],
    });
    expect(isLobbyingActive(state, 'test_law')).toBe(false);
  });

  it('gibt false wenn Status nicht bt_passed', () => {
    const state = makeState({
      gesetze: [makeLaw({ status: 'entwurf' })],
    });
    expect(isLobbyingActive(state, 'test_law')).toBe(false);
  });

  it('gibt false wenn mehr als 3 Monate vor Vote', () => {
    const state = makeState({
      month: 5,
      gesetze: [makeLaw({ brVoteMonth: 13 })],
    });
    expect(isLobbyingActive(state, 'test_law')).toBe(false);
  });
});

describe('calcBundesratMehrheit', () => {
  it('gibt Mehrheit bei hoher Bereitschaft', () => {
    const fraktion = makeFraktion({ basisBereitschaft: 60, beziehung: 50, laender: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'] });
    const state = makeState({
      bundesratFraktionen: [fraktion],
      gesetze: [makeLaw()],
    });
    const result = calcBundesratMehrheit(state, 'test_law');
    expect(result.ja).toBe(9);
    expect(result.mehrheit).toBe(true);
  });

  it('gibt keine Mehrheit bei niedriger Bereitschaft', () => {
    const fraktion = makeFraktion({ basisBereitschaft: 20, beziehung: 10, laender: ['A', 'B', 'C'] });
    const state = makeState({
      bundesratFraktionen: [fraktion],
      gesetze: [makeLaw()],
    });
    const result = calcBundesratMehrheit(state, 'test_law');
    expect(result.mehrheit).toBe(false);
  });

  it('gibt Auto-Ja bei Beziehung >= 80 (nicht-ideologisch)', () => {
    const fraktion = makeFraktion({ basisBereitschaft: 10, beziehung: 85, laender: Array(9).fill('X') });
    const state = makeState({
      bundesratFraktionen: [fraktion],
      gesetze: [makeLaw()],
    });
    const result = calcBundesratMehrheit(state, 'test_law');
    expect(result.ja).toBe(9);
    expect(result.details.some(d => d.includes('Auto-Ja'))).toBe(true);
  });

  it('blockiert Lobbying bei Beziehung < 20 ohne Reparatur', () => {
    const fraktion = makeFraktion({ basisBereitschaft: 60, beziehung: 10, laender: Array(9).fill('X') });
    const state = makeState({
      bundesratFraktionen: [fraktion],
      gesetze: [makeLaw()],
    });
    const result = calcBundesratMehrheit(state, 'test_law');
    expect(result.details.some(d => d.includes('gesperrt'))).toBe(true);
  });

  it('berücksichtigt Vorstufen-Bonus', () => {
    const fraktion = makeFraktion({ basisBereitschaft: 40, beziehung: 50, laender: Array(9).fill('X') });
    const state = makeState({
      bundesratFraktionen: [fraktion],
      gesetze: [makeLaw()],
      gesetzProjekte: {
        test_law: {
          gesetzId: 'test_law', status: 'vorbereitung',
          aktiveVorstufen: [],
          boni: { btStimmenBonus: 0, pkKostenRabatt: 0, kofinanzierung: 0, bundesratBonus: 15, medienRueckhalt: 0 },
        },
      },
    });
    const result = calcBundesratMehrheit(state, 'test_law');
    expect(result.details.some(d => d.includes('Vorstufen-Bonus'))).toBe(true);
  });

  it('gibt leeres Ergebnis bei unbekanntem Gesetz', () => {
    const state = makeState({ gesetze: [] });
    const result = calcBundesratMehrheit(state, 'nonexistent');
    expect(result.ja).toBe(0);
    expect(result.mehrheit).toBe(false);
  });
});

describe('calcBundesratMehrheitSimple', () => {
  it('berechnet Mehrheit mit einfacher Formel', () => {
    const fraktionen = [
      makeFraktion({ basisBereitschaft: 60, beziehung: 50, laender: Array(10).fill('X') }),
    ];
    const result = calcBundesratMehrheitSimple(fraktionen);
    // effBereitschaft = 60 + 50*0.2 = 70 > 50 → ja = 10
    expect(result.ja).toBe(10);
    expect(result.mehrheit).toBe(true);
  });

  it('berechnet keine Mehrheit bei niedriger Bereitschaft', () => {
    const fraktionen = [
      makeFraktion({ basisBereitschaft: 20, beziehung: 10, laender: Array(8).fill('X') }),
    ];
    const result = calcBundesratMehrheitSimple(fraktionen);
    expect(result.ja).toBe(0);
    expect(result.mehrheit).toBe(false);
  });
});

describe('getAggregierteZustimmung', () => {
  it('gibt Prozentwert 0-100', () => {
    const fraktion = makeFraktion({ basisBereitschaft: 60, beziehung: 50, laender: Array(9).fill('X') });
    const state = makeState({
      bundesratFraktionen: [fraktion],
      gesetze: [makeLaw()],
    });
    const result = getAggregierteZustimmung(state, 'test_law');
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });
});

describe('getBundesratVoteDetails', () => {
  it('gibt Details pro Fraktion', () => {
    const fraktion = makeFraktion({ laender: ['NW', 'BY'] });
    const state = makeState({
      bundesratFraktionen: [fraktion],
      gesetze: [makeLaw()],
    });
    const details = getBundesratVoteDetails(state, 'test_law');
    expect(details).toHaveLength(1);
    expect(details[0].fraktionId).toBe('koalitionstreue');
    expect(details[0].laender).toEqual(['NW', 'BY']);
    expect(details[0].bereitschaft).toBeGreaterThanOrEqual(0);
    expect(details[0].bereitschaft).toBeLessThanOrEqual(100);
  });

  it('gibt leeres Array bei unbekanntem Gesetz', () => {
    const state = makeState({ gesetze: [] });
    const details = getBundesratVoteDetails(state, 'nonexistent');
    expect(details).toEqual([]);
  });
});

describe('getBundesratAbstimmungsFelder', () => {
  it('gibt ein Feld pro Land', () => {
    const fraktion = makeFraktion({ laender: ['NW', 'BY'] });
    const state = makeState({
      bundesratFraktionen: [fraktion],
      gesetze: [makeLaw()],
    });
    const felder = getBundesratAbstimmungsFelder(state, 'test_law');
    expect(felder).toHaveLength(2);
    expect(felder[0].landId).toBe('NW');
    expect(felder[1].landId).toBe('BY');
  });
});

describe('lobbyFraktion', () => {
  it('Beziehungspflege: +3 Beziehung, kostet PK', () => {
    const fraktion = makeFraktion({ beziehung: 50 });
    const state = makeState({
      month: 5, // Außerhalb Lobbying-Fenster
      bundesratFraktionen: [fraktion],
      gesetze: [makeLaw({ brVoteMonth: 20 })],
    });
    const result = lobbyFraktion(state, 'koalitionstreue', 'test_law', 'beziehungspflege');
    expect(result.bundesratFraktionen[0].beziehung).toBe(53);
    expect(result.pk).toBeLessThan(state.pk);
  });

  it('Reparatur: +10 Beziehung bei Beziehung < 20', () => {
    const fraktion = makeFraktion({ beziehung: 5 });
    const state = makeState({
      bundesratFraktionen: [fraktion],
      gesetze: [makeLaw()],
    });
    const result = lobbyFraktion(state, 'koalitionstreue', 'test_law', 'reparatur');
    expect(result.bundesratFraktionen[0].beziehung).toBe(15);
    expect(result.bundesratFraktionen[0].reparaturEndMonth).toBe(state.month + 1);
  });

  it('Reparatur: nicht möglich bei Beziehung >= 20', () => {
    const fraktion = makeFraktion({ beziehung: 25 });
    const state = makeState({
      bundesratFraktionen: [fraktion],
      gesetze: [makeLaw()],
    });
    const result = lobbyFraktion(state, 'koalitionstreue', 'test_law', 'reparatur');
    expect(result).toBe(state);
  });

  it('Schicht 1: PK-Investition setzt pkInvestiert', () => {
    const fraktion = makeFraktion({ beziehung: 50 });
    const state = makeState({
      month: 11,
      bundesratFraktionen: [fraktion],
      gesetze: [makeLaw({ brVoteMonth: 13 })],
    });
    const result = lobbyFraktion(state, 'koalitionstreue', 'test_law', 1);
    expect(result.pk).toBeLessThan(state.pk);
    const law = result.gesetze.find(g => g.id === 'test_law')!;
    expect(law.lobbyFraktionen!['koalitionstreue'].pkInvestiert).toBe(true);
  });

  it('Schicht 1: nicht möglich wenn bereits investiert', () => {
    const fraktion = makeFraktion({ beziehung: 50 });
    const law = makeLaw({ brVoteMonth: 13, lobbyFraktionen: { koalitionstreue: { pkInvestiert: true } } });
    const state = makeState({
      month: 11,
      bundesratFraktionen: [fraktion],
      gesetze: [law],
    });
    const result = lobbyFraktion(state, 'koalitionstreue', 'test_law', 1);
    expect(result).toBe(state);
  });

  it('Schicht 1: reduzierte Kosten bei Beziehung 60-79', () => {
    const fraktion = makeFraktion({ beziehung: 65 });
    const state = makeState({
      month: 11,
      pk: 100,
      bundesratFraktionen: [fraktion],
      gesetze: [makeLaw({ brVoteMonth: 13 })],
    });
    const result = lobbyFraktion(state, 'koalitionstreue', 'test_law', 1);
    expect(result.pk).toBe(90); // 100 - 10 (reduziert)
  });

  it('Schicht 2 Trade-off annehmen: +10 Beziehung', () => {
    const fraktion = makeFraktion({ beziehung: 50 });
    const law = makeLaw({ brVoteMonth: 13 });
    const state = makeState({
      month: 11,
      bundesratFraktionen: [fraktion],
      gesetze: [law],
    });
    const result = lobbyFraktion(state, 'koalitionstreue', 'test_law', 2, {
      action: 'annehmen',
      tradeoffId: 't1',
    });
    expect(result.bundesratFraktionen[0].beziehung).toBe(60); // 50 + 10
  });

  it('Schicht 2 Trade-off ablehnen: -5 Beziehung', () => {
    const fraktion = makeFraktion({ beziehung: 50 });
    const law = makeLaw({ brVoteMonth: 13 });
    const state = makeState({
      month: 11,
      bundesratFraktionen: [fraktion],
      gesetze: [law],
    });
    const result = lobbyFraktion(state, 'koalitionstreue', 'test_law', 2, {
      action: 'ablehnen',
      tradeoffId: 't1',
    });
    expect(result.bundesratFraktionen[0].beziehung).toBe(45); // 50 - 5
  });

  it('Schicht 2 Gegenvorschlag: +5 Beziehung, kostet 20 PK', () => {
    const fraktion = makeFraktion({ beziehung: 50 });
    const law = makeLaw({ brVoteMonth: 13 });
    const state = makeState({
      month: 11,
      pk: 100,
      bundesratFraktionen: [fraktion],
      gesetze: [law],
    });
    const result = lobbyFraktion(state, 'koalitionstreue', 'test_law', 2, {
      action: 'gegenvorschlag',
      tradeoffId: 't1',
    });
    expect(result.bundesratFraktionen[0].beziehung).toBe(55);
    expect(result.pk).toBe(80); // 100 - 20
  });

  it('gibt State zurück bei unbekannter Fraktion', () => {
    const state = makeState({ gesetze: [makeLaw()] });
    const result = lobbyFraktion(state, 'nonexistent', 'test_law', 1);
    expect(result).toBe(state);
  });
});

describe('lobbyLand', () => {
  it('kostet 15 PK', () => {
    const state = makeState({
      bundesrat: [{ id: 'NW', name: 'NRW', mp: 'Bergmann', party: 'SPD', alignment: 'koalition', mood: 2, interests: [], votes: 6 }],
    });
    const result = lobbyLand(state, 'NW');
    expect(result.pk).toBe(state.pk - 15);
  });

  it('nicht möglich bei zu wenig PK', () => {
    const state = makeState({
      pk: 10,
      bundesrat: [{ id: 'NW', name: 'NRW', mp: 'Bergmann', party: 'SPD', alignment: 'koalition', mood: 2, interests: [], votes: 6 }],
    });
    const result = lobbyLand(state, 'NW');
    expect(result).toBe(state);
  });

  it('nicht möglich bei unbekanntem Land', () => {
    const state = makeState();
    const result = lobbyLand(state, 'XX');
    expect(result).toBe(state);
  });
});

describe('checkKohlSabotage', () => {
  it('triggert bei Ostblock-Beziehung < 15 und bt_passed land-Gesetz', () => {
    const state = makeState({
      bundesratFraktionen: [
        makeFraktion({ id: 'ostblock', beziehung: 10, sonderregel: 'kohl_saboteur' }),
      ],
      gesetze: [makeLaw({ status: 'bt_passed', tags: ['land'] })],
    });
    const result = checkKohlSabotage(state);
    expect(result.triggered).toBe(true);
    expect(result.lawId).toBe('test_law');
  });

  it('triggert nicht bei Beziehung >= 15', () => {
    const state = makeState({
      bundesratFraktionen: [
        makeFraktion({ id: 'ostblock', beziehung: 20, sonderregel: 'kohl_saboteur' }),
      ],
      gesetze: [makeLaw({ status: 'bt_passed', tags: ['land'] })],
    });
    const result = checkKohlSabotage(state);
    expect(result.triggered).toBe(false);
  });

  it('triggert nicht wenn Gesetz bereits sabotiert', () => {
    const state = makeState({
      bundesratFraktionen: [
        makeFraktion({ id: 'ostblock', beziehung: 10, sonderregel: 'kohl_saboteur' }),
      ],
      gesetze: [makeLaw({ status: 'bt_passed', tags: ['land'], kohlSabotageTriggered: true })],
    });
    const result = checkKohlSabotage(state);
    expect(result.triggered).toBe(false);
  });
});
