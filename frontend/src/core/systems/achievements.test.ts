import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { checkAchievements, getAllAchievements } from './achievements';
import { makeState, makeLaw } from '../test-helpers';

// test-setup.ts setzt ein localStorage-Mock auf (getItem → null, setItem → noop).
// Wir nutzen vi.spyOn, um einzelne Methoden pro Test zu überschreiben.

afterEach(() => {
  vi.restoreAllMocks();
});

describe('checkAchievements', () => {
  beforeEach(() => {
    // Standardmäßig leer: kein Achievement bisher freigeschaltet
    vi.spyOn(localStorage, 'getItem').mockReturnValue(null);
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {});
  });

  it('gibt leeres Array zurück wenn keine Achievement-Bedingung erfüllt', () => {
    // milieuZustimmung unter 40 damit volksnahe nicht greift
    const state = makeState({
      gameOver: false,
      won: false,
      firedEvents: [],
      milieuZustimmung: { arbeit: 35, mitte: 35, prog: 35, other: 35 },
    });
    const result = checkAchievements(state);
    expect(result).toHaveLength(0);
  });

  it('erste_legislatur: wird freigeschaltet wenn gameOver=true', () => {
    const state = makeState({ gameOver: true });
    const result = checkAchievements(state);
    const ids = result.map((a) => a.id);
    expect(ids).toContain('erste_legislatur');
  });

  it('wiedergewaehlt: wird freigeschaltet wenn won=true', () => {
    const state = makeState({ gameOver: true, won: true });
    const result = checkAchievements(state);
    const ids = result.map((a) => a.id);
    expect(ids).toContain('wiedergewaehlt');
  });

  it('wiedergewaehlt: wird NICHT freigeschaltet wenn won=false', () => {
    const state = makeState({ gameOver: true, won: false });
    const result = checkAchievements(state);
    const ids = result.map((a) => a.id);
    expect(ids).not.toContain('wiedergewaehlt');
  });

  it('erdrutschsieg: nur wenn won=true UND zust.g > 55', () => {
    const stateHigh = makeState({ gameOver: true, won: true, zust: { g: 56, arbeit: 60, mitte: 55, prog: 50 } });
    const stateLow = makeState({ gameOver: true, won: true, zust: { g: 54, arbeit: 60, mitte: 55, prog: 50 } });
    expect(checkAchievements(stateHigh).map((a) => a.id)).toContain('erdrutschsieg');
    expect(checkAchievements(stateLow).map((a) => a.id)).not.toContain('erdrutschsieg');
  });

  it('gesetzesmaschine: mindestens 10 beschlossene Gesetze', () => {
    const laws10 = Array.from({ length: 10 }, (_, i) =>
      makeLaw({ id: `g${i}`, status: 'beschlossen' }),
    );
    const laws9 = laws10.slice(0, 9);
    expect(checkAchievements(makeState({ gesetze: laws10 })).map((a) => a.id)).toContain('gesetzesmaschine');
    expect(checkAchievements(makeState({ gesetze: laws9 })).map((a) => a.id)).not.toContain('gesetzesmaschine');
  });

  it('sparfuchs: gameOver=true UND haushalt.saldo >= 0', () => {
    const base = makeState();
    const statePos = makeState({ gameOver: true, haushalt: { ...base.haushalt!, saldo: 0 } });
    const stateNeg = makeState({ gameOver: true, haushalt: { ...base.haushalt!, saldo: -1 } });
    expect(checkAchievements(statePos).map((a) => a.id)).toContain('sparfuchs');
    expect(checkAchievements(stateNeg).map((a) => a.id)).not.toContain('sparfuchs');
  });

  it('koalitionsfluesterer: gameOver=true UND beziehung >= 70', () => {
    const base = makeState();
    const stateGood = makeState({
      gameOver: true,
      koalitionspartner: { ...(base.koalitionspartner as object ?? {}), beziehung: 70 } as never,
    });
    const stateBad = makeState({
      gameOver: true,
      koalitionspartner: { ...(base.koalitionspartner as object ?? {}), beziehung: 69 } as never,
    });
    expect(checkAchievements(stateGood).map((a) => a.id)).toContain('koalitionsfluesterer');
    expect(checkAchievements(stateBad).map((a) => a.id)).not.toContain('koalitionsfluesterer');
  });

  it('krisenmanager: mindestens 15 firedEvents', () => {
    const events15 = Array.from({ length: 15 }, (_, i) => `event_${i}`);
    const events14 = events15.slice(0, 14);
    expect(checkAchievements(makeState({ firedEvents: events15 })).map((a) => a.id)).toContain('krisenmanager');
    expect(checkAchievements(makeState({ firedEvents: events14 })).map((a) => a.id)).not.toContain('krisenmanager');
  });

  it('europa_verfechter: EU-Route beschlossenes Gesetz', () => {
    const euLaw = makeLaw({ route: 'eu', status: 'beschlossen' });
    const localLaw = makeLaw({ route: 'land', status: 'beschlossen' });
    expect(checkAchievements(makeState({ gesetze: [euLaw] })).map((a) => a.id)).toContain('europa_verfechter');
    expect(checkAchievements(makeState({ gesetze: [localLaw] })).map((a) => a.id)).not.toContain('europa_verfechter');
  });

  it('bereits freigeschaltete Achievements werden nicht erneut zurückgegeben', () => {
    // Simuliert: erste_legislatur wurde bereits gespeichert
    vi.spyOn(localStorage, 'getItem').mockReturnValue(JSON.stringify(['erste_legislatur']));
    const state = makeState({ gameOver: true });
    const result = checkAchievements(state);
    expect(result.map((a) => a.id)).not.toContain('erste_legislatur');
  });

  it('speichert neue Achievements in localStorage', () => {
    const setItemSpy = vi.spyOn(localStorage, 'setItem');
    const state = makeState({ gameOver: true });
    checkAchievements(state);
    expect(setItemSpy).toHaveBeenCalled();
  });

  it('gibt leeres Array zurück wenn keine Achievements neu freigeschaltet werden', () => {
    const state = makeState({
      gameOver: false,
      won: false,
      milieuZustimmung: { arbeit: 35, mitte: 35, prog: 35, other: 35 },
    });
    expect(checkAchievements(state)).toHaveLength(0);
  });
});

describe('getAllAchievements', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('gibt alle 10 Achievements zurück', () => {
    vi.spyOn(localStorage, 'getItem').mockReturnValue(null);
    const all = getAllAchievements();
    expect(all).toHaveLength(10);
  });

  it('jedes Achievement hat id, title, desc und unlocked', () => {
    vi.spyOn(localStorage, 'getItem').mockReturnValue(null);
    const all = getAllAchievements();
    for (const a of all) {
      expect(typeof a.id).toBe('string');
      expect(typeof a.title).toBe('string');
      expect(typeof a.desc).toBe('string');
      expect(typeof a.unlocked).toBe('boolean');
    }
  });

  it('unlocked=false wenn localStorage leer', () => {
    vi.spyOn(localStorage, 'getItem').mockReturnValue(null);
    const all = getAllAchievements();
    expect(all.every((a) => a.unlocked === false)).toBe(true);
  });

  it('bereits gespeicherte Achievements haben unlocked=true', () => {
    vi.spyOn(localStorage, 'getItem').mockReturnValue(JSON.stringify(['erste_legislatur']));
    const all = getAllAchievements();
    const erste = all.find((a) => a.id === 'erste_legislatur');
    expect(erste?.unlocked).toBe(true);
  });
});
