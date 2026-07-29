/**
 * #284: Achievements schalten sich im Moment der Erfüllung frei (Toast),
 * statt nur retrospektiv in der Legislatur-Auswertung.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { makeState } from '../core/test-helpers';
import { DEFAULT_CONTENT } from '../data/defaults/scenarios';

vi.mock('../core/engine', async () => {
  const actual = await vi.importActual<typeof import('../core/engine')>('../core/engine');
  return { ...actual, tick: vi.fn() };
});

import { tick } from '../core/engine';
import { useGameStore } from './gameStore';
import { useUIStore } from './uiStore';

const DEFAULT_AUSRICHTUNG = { wirtschaft: 0, gesellschaft: 0, staat: 0 };
const tickMock = vi.mocked(tick);
const NEUTRAL_MILIEU_ZUSTIMMUNG = { arbeit: 35, mitte: 35, prog: 35, other: 35 };

function setupStore(state: ReturnType<typeof makeState>) {
  useGameStore.setState({
    state,
    content: DEFAULT_CONTENT,
    complexity: 1,
    ausrichtung: DEFAULT_AUSRICHTUNG,
    phase: 'playing',
    cloudSaveId: null,
  });
}

describe('gameStore.gameTick — #284 Achievements zur Laufzeit', () => {
  beforeEach(() => {
    tickMock.mockReset();
    useUIStore.setState({ fastForwardActive: false, toastQueue: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('zeigt einen Erfolgs-Toast, sobald eine Achievement-Bedingung im Tick erfüllt wird', () => {
    const prevState = makeState({
      month: 47,
      speed: 1,
      gameOver: false,
      milieuZustimmung: NEUTRAL_MILIEU_ZUSTIMMUNG,
    });
    setupStore(prevState);
    tickMock.mockReturnValue({ ...prevState, month: 48, gameOver: true });

    useGameStore.getState().gameTick();

    const toasts = useUIStore.getState().toastQueue;
    expect(toasts.some((t) => t.type === 'success')).toBe(true);
  });

  it('zeigt keinen Erfolgs-Toast, wenn keine neue Bedingung erfüllt ist', () => {
    const prevState = makeState({
      month: 5,
      speed: 1,
      gameOver: false,
      milieuZustimmung: NEUTRAL_MILIEU_ZUSTIMMUNG,
    });
    setupStore(prevState);
    tickMock.mockReturnValue({ ...prevState, month: 6 });

    useGameStore.getState().gameTick();

    expect(useUIStore.getState().toastQueue).toHaveLength(0);
  });

  it('feuert dasselbe Achievement nur einmal über mehrere Ticks hinweg (Persistenz)', () => {
    // Stateful, Key-bewusster localStorage-Spy: bildet echtes get/set-Verhalten nach,
    // damit checkAchievements() bereits freigeschaltete IDs über Ticks hinweg erkennt
    // (das globale Test-Setup-Mock ist sonst ein reines no-op). gameTick() ruft daneben
    // auch saveGame() auf, das unter einem anderen Key schreibt — ein simpler Einzelwert
    // ohne Key-Zuordnung würde den Achievement-Eintrag also mit dem Save überschreiben.
    const store: Record<string, string> = {};
    vi.spyOn(localStorage, 'getItem').mockImplementation((key) => store[key] ?? null);
    vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      store[key] = value;
    });

    // "krisenmanager" (>= 15 firedEvents) statt eines gameOver-Achievements,
    // damit gameTicks gameOver-Frühausstieg den zweiten Tick nicht überspringt.
    const events15 = Array.from({ length: 15 }, (_, i) => `event_${i}`);
    const prevState = makeState({
      month: 5,
      speed: 1,
      gameOver: false,
      milieuZustimmung: NEUTRAL_MILIEU_ZUSTIMMUNG,
    });
    setupStore(prevState);
    tickMock.mockReturnValue({ ...prevState, month: 6, firedEvents: events15 });
    useGameStore.getState().gameTick();
    const firstCount = useUIStore.getState().toastQueue.length;
    expect(firstCount).toBeGreaterThan(0);

    // Zweiter Tick liefert erneut einen Zustand mit >= 15 firedEvents — das
    // Achievement ist bereits in localStorage vermerkt und darf nicht erneut toasten.
    useUIStore.setState({ toastQueue: [] });
    tickMock.mockReturnValue({ ...prevState, month: 7, firedEvents: events15 });
    useGameStore.getState().gameTick();

    expect(useUIStore.getState().toastQueue).toHaveLength(0);
  });
});
