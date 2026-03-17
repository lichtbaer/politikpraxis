import { describe, it, expect } from 'vitest';
import {
  gesetzKongruenz,
  milieuGesetzKongruenz,
  getIdeologieLabelKey,
  tickExtremismusDruck,
  POL_LABELS,
} from './ideologie';
import { createInitialState } from './state';
import { DEFAULT_CONTENT } from '../data/defaults/scenarios';
import type { GameState, GameEvent, Law, Milieu } from './types';

function makeState(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialState(DEFAULT_CONTENT, 4);
  return { ...base, ...overrides };
}

describe('gesetzKongruenz', () => {
  it('gibt 50 bei Gesetz ohne Ideologie', () => {
    const spieler = { wirtschaft: 0, gesellschaft: 0, staat: 0 };
    expect(gesetzKongruenz(spieler, undefined)).toBe(50);
    expect(gesetzKongruenz(spieler, { ideologie: undefined } as any)).toBe(50);
  });

  it('gibt hohen Score bei ähnlicher Ideologie', () => {
    const spieler = { wirtschaft: -50, gesellschaft: -30, staat: -20 };
    const gesetz = { ideologie: { wirtschaft: -45, gesellschaft: -25, staat: -15 } } as Law;
    expect(gesetzKongruenz(spieler, gesetz)).toBeGreaterThan(90);
  });

  it('gibt niedrigen Score bei gegensätzlicher Ideologie', () => {
    const spieler = { wirtschaft: -80, gesellschaft: -70, staat: -50 };
    const gesetz = { ideologie: { wirtschaft: 80, gesellschaft: 70, staat: 50 } } as Law;
    expect(gesetzKongruenz(spieler, gesetz)).toBeLessThan(35);
  });
});

describe('milieuGesetzKongruenz', () => {
  it('berechnet Kongruenz zwischen Milieu und Gesetz', () => {
    const milieu: Milieu = { id: 'm1', ideologie: { wirtschaft: -50, gesellschaft: -30, staat: 0 }, min_complexity: 2 };
    const gesetz = { ideologie: { wirtschaft: -50, gesellschaft: -30, staat: 0 } } as Law;
    expect(milieuGesetzKongruenz(milieu, gesetz)).toBe(100);
  });

  it('gibt niedrigen Score bei Gegensatz', () => {
    const milieu: Milieu = { id: 'm1', ideologie: { wirtschaft: 80, gesellschaft: 60, staat: 40 }, min_complexity: 2 };
    const gesetz = { ideologie: { wirtschaft: -80, gesellschaft: -60, staat: -40 } } as Law;
    expect(milieuGesetzKongruenz(milieu, gesetz)).toBeLessThan(40);
  });
});

describe('POL_LABELS', () => {
  it('hat alle 3 Achsen', () => {
    expect(POL_LABELS.wirtschaft).toEqual(['Umverteilung', 'Freier Markt']);
    expect(POL_LABELS.gesellschaft).toEqual(['Progressiv', 'Konservativ']);
    expect(POL_LABELS.staat).toEqual(['Gemeinschaft', 'Eigenverantwortung']);
  });
});

describe('getIdeologieLabelKey', () => {
  it('Wirtschaft: korrekte Labels', () => {
    expect(getIdeologieLabelKey('wirtschaft', -60)).toContain('starkLinks');
    expect(getIdeologieLabelKey('wirtschaft', -30)).toContain('links');
    expect(getIdeologieLabelKey('wirtschaft', 0)).toContain('mitte');
    expect(getIdeologieLabelKey('wirtschaft', 30)).toContain('rechts');
    expect(getIdeologieLabelKey('wirtschaft', 60)).toContain('starkRechts');
  });

  it('Gesellschaft: korrekte Labels', () => {
    expect(getIdeologieLabelKey('gesellschaft', -60)).toContain('sehrProgressiv');
    expect(getIdeologieLabelKey('gesellschaft', -30)).toContain('progressiv');
    expect(getIdeologieLabelKey('gesellschaft', 0)).toContain('liberal');
    expect(getIdeologieLabelKey('gesellschaft', 30)).toContain('konservativ');
    expect(getIdeologieLabelKey('gesellschaft', 60)).toContain('sehrKonservativ');
  });

  it('Staat: korrekte Labels', () => {
    expect(getIdeologieLabelKey('staat', -60)).toContain('starkerStaat');
    expect(getIdeologieLabelKey('staat', -30)).toContain('aktiverStaat');
    expect(getIdeologieLabelKey('staat', 0)).toContain('gemischtesModell');
    expect(getIdeologieLabelKey('staat', 30)).toContain('schlankerStaat');
    expect(getIdeologieLabelKey('staat', 60)).toContain('minimalerStaat');
  });

  it('gibt Grenzwerte korrekt', () => {
    // genau -50
    expect(getIdeologieLabelKey('wirtschaft', -50)).toContain('links');
    // genau -20
    expect(getIdeologieLabelKey('wirtschaft', -20)).toContain('mitte');
    // genau 20
    expect(getIdeologieLabelKey('wirtschaft', 20)).toContain('rechts');
    // genau 50
    expect(getIdeologieLabelKey('wirtschaft', 50)).toContain('starkRechts');
  });
});

describe('tickExtremismusDruck', () => {
  const warnEvent: GameEvent = {
    id: 'koalitionspartner_extremismus_warnung', type: 'warn', icon: '', typeLabel: '', title: '', quote: '', context: '',
    choices: [{ label: 'OK', desc: '', cost: 0, type: 'safe', effect: {}, log: '' }],
    ticker: '',
  };
  const verfassungEvent: GameEvent = {
    id: 'verfassungsgericht_klage', type: 'danger', icon: '', typeLabel: '', title: '', quote: '', context: '',
    choices: [{ label: 'OK', desc: '', cost: 0, type: 'safe', effect: {}, log: '' }],
    ticker: '',
  };

  it('triggert Warnung bei Malus > 8', () => {
    // wirtschaft 75 → Malus = 4, gesellschaft 80 → Malus = 9 → Total > 8
    const state = makeState({ activeEvent: null, firedEvents: [], extremismusWarnung: false });
    const result = tickExtremismusDruck(state, { wirtschaft: 75, gesellschaft: 80, staat: 0 }, [warnEvent]);
    expect(result.activeEvent).toBeTruthy();
    expect(result.activeEvent!.id).toBe('koalitionspartner_extremismus_warnung');
    expect(result.extremismusWarnung).toBe(true);
  });

  it('triggert Warnung nicht erneut', () => {
    const state = makeState({ activeEvent: null, firedEvents: [], extremismusWarnung: true });
    const result = tickExtremismusDruck(state, { wirtschaft: 75, gesellschaft: 80, staat: 0 }, [warnEvent]);
    expect(result.activeEvent).toBeNull();
  });

  it('triggert Verfassungsgericht bei Malus > 20', () => {
    // wirtschaft 100: ((100-65)/10)^2*4 = (3.5)^2*4 = 49
    const state = makeState({ activeEvent: null, firedEvents: [], verfassungsgerichtAktiv: false, extremismusWarnung: true });
    const result = tickExtremismusDruck(state, { wirtschaft: 100, gesellschaft: 100, staat: 0 }, [warnEvent, verfassungEvent]);
    expect(result.verfassungsgerichtAktiv).toBe(true);
    expect(result.verfassungsgerichtVerfahrenBisMonat).toBeDefined();
  });

  it('gibt State zurück bei leerer Event-Liste', () => {
    const state = makeState();
    const result = tickExtremismusDruck(state, { wirtschaft: 100, gesellschaft: 100, staat: 100 }, []);
    expect(result).toBe(state);
  });

  it('gibt State zurück wenn bereits Event aktiv', () => {
    const existing: GameEvent = { ...warnEvent, id: 'other' };
    const state = makeState({ activeEvent: existing });
    const result = tickExtremismusDruck(state, { wirtschaft: 100, gesellschaft: 100, staat: 100 }, [warnEvent]);
    expect(result).toBe(state);
  });

  it('triggert nichts bei niedrigem Extremismus', () => {
    const state = makeState({ activeEvent: null, firedEvents: [] });
    const result = tickExtremismusDruck(state, { wirtschaft: 30, gesellschaft: 20, staat: 10 }, [warnEvent]);
    expect(result.activeEvent).toBeNull();
  });
});
