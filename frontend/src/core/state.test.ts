import { describe, it, expect } from 'vitest';
import { validateGameState, migrateGameState, createInitialState, syncMediaState } from './state';
import { berechneKoalitionspartnerKandidaten } from './systems/koalition';
import { DEFAULT_CONTENT } from '../data/defaults/scenarios';
import type { GameState, SpielerParteiState } from './types';

describe('validateGameState', () => {
  it('clampt wahlprognose auf 0–100', () => {
    const raw = {
      month: 1,
      speed: 0,
      pk: 100,
      view: 'agenda',
      kpi: { al: 50, hh: 50, gi: 50, zf: 50 },
      zust: { g: 52, arbeit: 58, mitte: 54, prog: 44 },
      coalition: 50,
      chars: [],
      gesetze: [],
      bundesrat: [],
      bundesratFraktionen: [],
      activeEvent: null,
      firedEvents: [],
      firedCharEvents: [],
      firedBundesratEvents: [],
      firedKommunalEvents: [],
      pending: [],
      log: [],
      ticker: '',
      gameOver: false,
      won: false,
      wahlprognose: 99.9,
    };
    const validated = validateGameState(raw);
    expect(validated.wahlprognose).toBe(99.9);
  });

  it('clampt manipulierte wahlprognose 999 auf 100', () => {
    const raw = {
      month: 1,
      speed: 0,
      pk: 100,
      view: 'agenda',
      kpi: { al: 50, hh: 50, gi: 50, zf: 50 },
      zust: { g: 52, arbeit: 58, mitte: 54, prog: 44 },
      coalition: 50,
      chars: [],
      gesetze: [],
      bundesrat: [],
      bundesratFraktionen: [],
      activeEvent: null,
      firedEvents: [],
      firedCharEvents: [],
      firedBundesratEvents: [],
      firedKommunalEvents: [],
      pending: [],
      log: [],
      ticker: '',
      gameOver: false,
      won: false,
      wahlprognose: 999,
    };
    const validated = validateGameState(raw);
    expect(validated.wahlprognose).toBe(100);
  });

  it('clampt zust.g auf 0–100', () => {
    const raw = {
      month: 1,
      speed: 0,
      pk: 100,
      view: 'agenda',
      kpi: { al: 50, hh: 50, gi: 50, zf: 50 },
      zust: { g: 999, arbeit: 58, mitte: 54, prog: 44 },
      coalition: 50,
      chars: [],
      gesetze: [],
      bundesrat: [],
      bundesratFraktionen: [],
      activeEvent: null,
      firedEvents: [],
      firedCharEvents: [],
      firedBundesratEvents: [],
      firedKommunalEvents: [],
      pending: [],
      log: [],
      ticker: '',
      gameOver: false,
      won: false,
    };
    const validated = validateGameState(raw);
    expect(validated.zust.g).toBe(100);
  });

  it('akzeptiert speed 2 (2×, #282)', () => {
    const raw = {
      month: 1,
      speed: 2,
      pk: 100,
      view: 'agenda',
      kpi: { al: 50, hh: 50, gi: 50, zf: 50 },
      zust: { g: 52, arbeit: 58, mitte: 54, prog: 44 },
      coalition: 50,
      chars: [],
      gesetze: [],
      bundesrat: [],
      bundesratFraktionen: [],
      activeEvent: null,
      firedEvents: [],
      firedCharEvents: [],
      firedBundesratEvents: [],
      firedKommunalEvents: [],
      pending: [],
      log: [],
      ticker: '',
      gameOver: false,
      won: false,
    };
    const validated = validateGameState(raw);
    expect(validated.speed).toBe(2);
  });

  it('fällt bei ungültigem speed-Wert auf 0 zurück', () => {
    const raw = {
      month: 1,
      speed: 99,
      pk: 100,
      view: 'agenda',
      kpi: { al: 50, hh: 50, gi: 50, zf: 50 },
      zust: { g: 52, arbeit: 58, mitte: 54, prog: 44 },
      coalition: 50,
      chars: [],
      gesetze: [],
      bundesrat: [],
      bundesratFraktionen: [],
      activeEvent: null,
      firedEvents: [],
      firedCharEvents: [],
      firedBundesratEvents: [],
      firedKommunalEvents: [],
      pending: [],
      log: [],
      ticker: '',
      gameOver: false,
      won: false,
    };
    const validated = validateGameState(raw);
    expect(validated.speed).toBe(0);
  });

  it('wirft bei ungültigem Input', () => {
    expect(() => validateGameState(null)).toThrow('Invalid GameState');
    expect(() => validateGameState('string')).toThrow('Invalid GameState');
    expect(() => validateGameState([])).toThrow('Invalid GameState');
  });

  it('leitet media-Objekt durch', () => {
    const raw = {
      month: 1, speed: 0, pk: 100, view: 'agenda',
      kpi: { al: 50, hh: 50, gi: 50, zf: 50 },
      zust: { g: 52, arbeit: 58, mitte: 54, prog: 44 },
      coalition: 50, chars: [], gesetze: [], bundesrat: [], bundesratFraktionen: [],
      activeEvent: null, firedEvents: [], firedCharEvents: [], firedBundesratEvents: [],
      firedKommunalEvents: [], pending: [], log: [], ticker: '', gameOver: false, won: false,
      media: { klima: 72, klimaHistory: [72] },
    };
    const validated = validateGameState(raw);
    expect(validated.media?.klima).toBe(72);
    expect(validated.media?.klimaHistory).toEqual([72]);
  });
});

describe('createInitialState', () => {
  it('enthält state.media mit Standardklima', () => {
    const state = createInitialState(DEFAULT_CONTENT, 4);
    expect(state.media).toBeDefined();
    expect(typeof state.media?.klima).toBe('number');
    expect(state.media?.klima).toBe(state.medienKlima);
  });

  it('media.klimaHistory ist synchron mit medienKlimaHistory', () => {
    const state = createInitialState(DEFAULT_CONTENT, 4);
    expect(state.media?.klimaHistory).toEqual(state.medienKlimaHistory);
  });

  describe('koalitionspartnerOverride (#283)', () => {
    const spielerPartei: SpielerParteiState = { id: 'sdp', kuerzel: 'SDP', farbe: '#e3000f', name: 'Sozialdemokratische Partei' };
    const ausrichtung = { wirtschaft: -60, gesellschaft: -20, staat: -40 };

    it('nutzt einen gültigen Override statt des automatisch nächsten Partners', () => {
      const kandidaten = berechneKoalitionspartnerKandidaten('sdp', ausrichtung);
      const alternative = kandidaten[1].parteiId;
      expect(alternative).not.toBe(kandidaten[0].parteiId);

      const state = createInitialState(DEFAULT_CONTENT, 4, ausrichtung, spielerPartei, undefined, 'sie', alternative);
      expect(state.koalitionspartner?.id).toBe(alternative);
    });

    it('ignoriert einen ungültigen Override und fällt auf den automatischen Partner zurück', () => {
      const kandidaten = berechneKoalitionspartnerKandidaten('sdp', ausrichtung);
      const state = createInitialState(DEFAULT_CONTENT, 4, ausrichtung, spielerPartei, undefined, 'sie', 'sdp');
      expect(state.koalitionspartner?.id).toBe(kandidaten[0].parteiId);
    });

    it('ohne Override bleibt das Verhalten unverändert (automatisch nächster Partner)', () => {
      const kandidaten = berechneKoalitionspartnerKandidaten('sdp', ausrichtung);
      const state = createInitialState(DEFAULT_CONTENT, 4, ausrichtung, spielerPartei);
      expect(state.koalitionspartner?.id).toBe(kandidaten[0].parteiId);
    });
  });
});

describe('migrateGameState', () => {
  const baseState = createInitialState(DEFAULT_CONTENT, 4);

  it('befüllt media aus flachen Feldern wenn nicht vorhanden', () => {
    const withoutMedia = { ...baseState, media: undefined } as GameState;
    const migrated = migrateGameState(withoutMedia);
    expect(migrated.media).toBeDefined();
    expect(migrated.media?.klima).toBe(withoutMedia.medienKlima);
  });

  it('ist idempotent — überschreibt vorhandenes media nicht', () => {
    const withMedia = { ...baseState, media: { klima: 99, klimaHistory: [99] } };
    const migrated = migrateGameState(withMedia);
    expect(migrated.media?.klima).toBe(99);
  });

  it('überträgt letzterSkandal in media', () => {
    const s = { ...baseState, letzterSkandal: 7, media: undefined } as GameState;
    const migrated = migrateGameState(s);
    expect(migrated.media?.letzterSkandal).toBe(7);
  });

  it('überträgt medienAkteure in media.akteure', () => {
    const akteure = { oeffentlich: { stimmung: 5, reichweite: 60 } };
    const s = { ...baseState, medienAkteure: akteure, media: undefined } as GameState;
    const migrated = migrateGameState(s);
    expect(migrated.media?.akteure).toEqual(akteure);
  });
});

describe('syncMediaState', () => {
  it('no-op wenn media nicht gesetzt', () => {
    const s = createInitialState(DEFAULT_CONTENT, 4);
    const withoutMedia = { ...s, media: undefined } as GameState;
    expect(syncMediaState(withoutMedia)).toBe(withoutMedia);
  });

  it('spiegelt aktualisiertes medienKlima in media', () => {
    const s = createInitialState(DEFAULT_CONTENT, 4);
    const updated = { ...s, medienKlima: 88 };
    const synced = syncMediaState(updated);
    expect(synced.media?.klima).toBe(88);
  });
});
