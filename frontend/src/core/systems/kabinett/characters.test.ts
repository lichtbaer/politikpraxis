import { describe, it, expect } from 'vitest';
import { applyCharBonuses, checkUltimatums, applyMoodChange, resolveCharRelationships } from './characters';
import { createInitialState } from '../../state';
import { DEFAULT_CONTENT } from '../../../data/defaults/scenarios';
import { SPIELBARE_PARTEIEN } from '../../../data/defaults/parteien';
import { echterContent } from '../../simulation/echterContent';
import type { GameState, Character, GameEvent } from '../../types';

function makeChar(overrides: Partial<Character> = {}): Character {
  return {
    id: 'test',
    name: 'Test',
    role: 'Minister',
    initials: 'T',
    color: '#000',
    mood: 2,
    loyalty: 3,
    bio: '',
    interests: [],
    bonus: { trigger: '', desc: '', applies: '' },
    ultimatum: { moodThresh: 0, event: 'test_event' },
    ...overrides,
  };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialState(DEFAULT_CONTENT, 4);
  return { ...base, ...overrides };
}

describe('applyMoodChange', () => {
  it('ändert Mood des spezifizierten Characters', () => {
    const state = makeState({
      chars: [makeChar({ id: 'fm', mood: 2 }), makeChar({ id: 'wm', mood: 3 })],
    });
    const result = applyMoodChange(state, { fm: 1 });
    expect(result.chars.find(c => c.id === 'fm')!.mood).toBe(3);
    expect(result.chars.find(c => c.id === 'wm')!.mood).toBe(3); // unverändert
  });

  it('clampt Mood auf 0-4', () => {
    const state = makeState({ chars: [makeChar({ id: 'fm', mood: 4 })] });
    const result = applyMoodChange(state, { fm: 2 });
    expect(result.chars.find(c => c.id === 'fm')!.mood).toBe(4);
  });

  it('clampt Mood nicht unter 0', () => {
    const state = makeState({ chars: [makeChar({ id: 'fm', mood: 0 })] });
    const result = applyMoodChange(state, { fm: -2 });
    expect(result.chars.find(c => c.id === 'fm')!.mood).toBe(0);
  });

  it('ändert auch Loyalty wenn angegeben', () => {
    const state = makeState({ chars: [makeChar({ id: 'fm', loyalty: 3 })] });
    const result = applyMoodChange(state, {}, { fm: -1 });
    expect(result.chars.find(c => c.id === 'fm')!.loyalty).toBe(2);
  });

  it('clampt Loyalty auf 0-5', () => {
    const state = makeState({ chars: [makeChar({ id: 'fm', loyalty: 5 })] });
    const result = applyMoodChange(state, {}, { fm: 2 });
    expect(result.chars.find(c => c.id === 'fm')!.loyalty).toBe(5);
  });
});

describe('checkUltimatums', () => {
  it('triggert Event wenn Mood <= Threshold (ab Monat 4)', () => {
    const chars = [makeChar({ id: 'fm', mood: 0, ultimatum: { moodThresh: 0, event: 'fm_ultimatum' } })];
    const event: GameEvent = {
      id: 'fm_ultimatum', type: 'danger', icon: '', typeLabel: '', title: '', quote: '', context: '',
      choices: [{ label: 'OK', desc: '', cost: 0, type: 'safe', effect: {}, log: '' }],
      ticker: '',
    };
    const state = makeState({
      chars,
      month: 4,
      activeEvent: null,
      firedCharEvents: [],
    });
    const result = checkUltimatums(state, { fm_ultimatum: event });
    expect(result.activeEvent).toBeTruthy();
    expect(result.activeEvent!.id).toBe('fm_ultimatum');
    expect(result.firedCharEvents).toContain('fm_ultimatum');
  });

  it('triggert nicht vor Monat 4 (SMA-321)', () => {
    const chars = [makeChar({ id: 'fm', mood: 0, ultimatum: { moodThresh: 0, event: 'fm_ultimatum' } })];
    const event: GameEvent = {
      id: 'fm_ultimatum', type: 'danger', icon: '', typeLabel: '', title: '', quote: '', context: '',
      choices: [{ label: 'OK', desc: '', cost: 0, type: 'safe', effect: {}, log: '' }],
      ticker: '',
    };
    const state = makeState({
      chars,
      month: 1,
      activeEvent: null,
      firedCharEvents: [],
    });
    const result = checkUltimatums(state, { fm_ultimatum: event });
    expect(result.activeEvent).toBeNull();
  });

  it('triggert nicht wenn bereits gefeuert', () => {
    const chars = [makeChar({ id: 'fm', mood: 0, ultimatum: { moodThresh: 0, event: 'fm_ultimatum' } })];
    const event: GameEvent = {
      id: 'fm_ultimatum', type: 'danger', icon: '', typeLabel: '', title: '', quote: '', context: '',
      choices: [{ label: 'OK', desc: '', cost: 0, type: 'safe', effect: {}, log: '' }],
      ticker: '',
    };
    const state = makeState({
      chars,
      month: 4,
      activeEvent: null,
      firedCharEvents: ['fm_ultimatum'],
    });
    const result = checkUltimatums(state, { fm_ultimatum: event });
    expect(result.activeEvent).toBeNull();
  });

  it('triggert nicht wenn bereits ein Event aktiv', () => {
    const chars = [makeChar({ id: 'fm', mood: 0, ultimatum: { moodThresh: 0, event: 'fm_ultimatum' } })];
    const event: GameEvent = {
      id: 'fm_ultimatum', type: 'danger', icon: '', typeLabel: '', title: '', quote: '', context: '',
      choices: [{ label: 'OK', desc: '', cost: 0, type: 'safe', effect: {}, log: '' }],
      ticker: '',
    };
    const existingEvent: GameEvent = { ...event, id: 'other' };
    const state = makeState({
      chars,
      month: 4,
      activeEvent: existingEvent,
      firedCharEvents: [],
    });
    const result = checkUltimatums(state, { fm_ultimatum: event });
    expect(result.activeEvent!.id).toBe('other');
  });

  it('triggert nicht wenn Mood > Threshold', () => {
    const chars = [makeChar({ id: 'fm', mood: 2, ultimatum: { moodThresh: 0, event: 'fm_ultimatum' } })];
    const event: GameEvent = {
      id: 'fm_ultimatum', type: 'danger', icon: '', typeLabel: '', title: '', quote: '', context: '',
      choices: [{ label: 'OK', desc: '', cost: 0, type: 'safe', effect: {}, log: '' }],
      ticker: '',
    };
    const state = makeState({
      chars,
      month: 4,
      activeEvent: null,
      firedCharEvents: [],
    });
    const result = checkUltimatums(state, { fm_ultimatum: event });
    expect(result.activeEvent).toBeNull();
  });
});

describe('applyCharBonuses', () => {
  it('Umweltminister mood >= 4: erhöht zf leicht (persistenter KPI-Bonus)', () => {
    const state = makeState({
      chars: [makeChar({ id: 'gp_um', ressort: 'umwelt', mood: 4 })],
      kpi: { al: 5, hh: 0, gi: 30, zf: 60 },
    });
    const result = applyCharBonuses(state);
    expect(result.kpi.zf).toBeGreaterThan(60);
  });

  it('Wirtschaftsminister mood >= 4: senkt al deterministisch', () => {
    const state = makeState({
      chars: [makeChar({ id: 'cdp_wm', ressort: 'wirtschaft', mood: 4 })],
      kpi: { al: 5, hh: 0, gi: 30, zf: 60 },
    });
    const result = applyCharBonuses(state);
    expect(result.kpi.al).toBeLessThan(5);
  });

  it('Minister mit mood < 4: kein Bonus', () => {
    const state = makeState({
      chars: [
        makeChar({ id: 'gp_um', ressort: 'umwelt', mood: 3 }),
        makeChar({ id: 'cdp_wm', ressort: 'wirtschaft', mood: 3 }),
      ],
      kpi: { al: 5, hh: 0, gi: 30, zf: 60 },
    });
    const result = applyCharBonuses(state);
    expect(result.kpi.al).toBe(5);
    expect(result.kpi.zf).toBe(60);
  });

  it('Finanzminister mood >= 4 und negatives hh: verbessert hh', () => {
    const state = makeState({
      chars: [makeChar({ id: 'cdp_fm', ressort: 'finanzen', mood: 4 })],
      kpi: { al: 5, hh: -1, gi: 30, zf: 60 },
    });
    const result = applyCharBonuses(state);
    expect(result.kpi.hh).toBeGreaterThan(-1);
  });

  it('Finanzminister Bonus nur bei negativem hh', () => {
    const state = makeState({
      chars: [makeChar({ id: 'cdp_fm', ressort: 'finanzen', mood: 4 })],
      kpi: { al: 5, hh: 0.5, gi: 30, zf: 60 },
    });
    const result = applyCharBonuses(state);
    expect(result.kpi.hh).toBe(0.5); // Kein Effekt
  });
});

describe('resolveCharRelationships (SMA-279)', () => {
  const kanzler = makeChar({
    id: 'kanzler',
    ist_kanzler: true,
    relationships: [
      { target: 'im', type: 'verfeindet', staerke: 2 },
      { target: 'jm', type: 'verbuendet', staerke: 2 },
    ],
  });
  const fm = makeChar({
    id: 'sdp_fm',
    name: 'Finanzministerin',
    ressort: 'finanzen',
    relationships: [
      { target: 'wm', type: 'verfeindet', staerke: 2 },
      { target: 'gm', type: 'verfeindet', staerke: 1 },
    ],
  });
  const wm = makeChar({ id: 'gp_wm', name: 'Wirtschaftsminister', ressort: 'wirtschaft' });
  const im = makeChar({
    id: 'sdp_im',
    ressort: 'innen',
    relationships: [{ target: 'kanzler', type: 'verfeindet', staerke: 2 }],
  });

  it('löst Rollen-Schlüssel auf den amtierenden Minister des Ressorts auf', () => {
    const res = resolveCharRelationships([kanzler, fm, wm, im], fm);
    // 'gm' ist nicht im Kabinett → entfällt
    expect(res.map((r) => [r.target.id, r.rel.type])).toEqual([['gp_wm', 'verfeindet']]);
  });

  it('löst "kanzler" auf den (synthetischen) Kanzler auf', () => {
    const res = resolveCharRelationships([kanzler, fm, wm, im], im);
    expect(res.map((r) => r.target.id)).toEqual(['kanzler']);
    expect(resolveCharRelationships([kanzler, fm, wm, im], kanzler).map((r) => r.target.id)).toEqual(['sdp_im']);
  });

  it('funktioniert mit direkten Char-IDs (Offline-Fallback mit Legacy-IDs)', () => {
    const legacyFm = makeChar({ id: 'fm', relationships: [{ target: 'wm', type: 'verfeindet', staerke: 2 }] });
    const legacyWm = makeChar({ id: 'wm' });
    expect(resolveCharRelationships([legacyFm, legacyWm], legacyFm).map((r) => r.target.id)).toEqual(['wm']);
  });

  it('liefert nichts ohne relationships', () => {
    expect(resolveCharRelationships([kanzler, wm], wm)).toEqual([]);
  });

  it('echter Content: jedes Kabinettsmitglied hat Beziehungen, die im Kabinett auflösbar sind', () => {
    const content = echterContent();
    for (const partei of SPIELBARE_PARTEIEN) {
      const state = createInitialState(content, 4, undefined, {
        id: partei.id,
        kuerzel: partei.kuerzel,
        farbe: partei.farbe,
        name: partei.name,
      });
      expect(state.chars.length, partei.id).toBeGreaterThan(1);
      let aufgeloest = 0;
      for (const char of state.chars) {
        expect(char.relationships?.length ?? 0, `${partei.id}/${char.id}`).toBeGreaterThan(0);
        const res = resolveCharRelationships(state.chars, char);
        for (const { target } of res) {
          expect(state.chars).toContain(target);
        }
        aufgeloest += res.length;
      }
      expect(aufgeloest, partei.id).toBeGreaterThan(0);
    }
  });
});
