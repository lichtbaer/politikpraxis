/**
 * #282: Integrationstest für die gameTick-Verdrahtung von
 * "Weiter bis zum nächsten Ereignis" (getFastForwardStopReason).
 * `tick()` wird gemockt, um die Store-Logik unabhängig von der
 * vollen Engine-Pipeline deterministisch zu testen.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { makeState, makeLaw } from '../core/test-helpers';
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

describe('gameStore.gameTick — #282 Weiter bis zum nächsten Ereignis', () => {
  beforeEach(() => {
    tickMock.mockReset();
    useUIStore.setState({ fastForwardActive: false, toastQueue: [] });
    useUIStore.getState().setPlayerSettings({ monatszusammenfassung: false });
  });

  it('stoppt den Vorlauf und pausiert, wenn eine BR-Abstimmung aufgelöst wurde', () => {
    const brLaw = makeLaw({ id: 'br_law', status: 'bt_passed', brVoteMonth: 6 });
    const prevState = makeState({ month: 5, speed: 2, gesetze: [brLaw] });
    setupStore(prevState);
    useUIStore.getState().setFastForwardActive(true);
    tickMock.mockReturnValue({
      ...prevState,
      month: 6,
      gesetze: [{ ...brLaw, status: 'beschlossen' as const }],
    });

    useGameStore.getState().gameTick();

    expect(useGameStore.getState().state.speed).toBe(0);
    expect(useGameStore.getState().state.speedBeforePause).toBe(2);
    expect(useUIStore.getState().fastForwardActive).toBe(false);
    expect(useUIStore.getState().toastQueue.length).toBeGreaterThan(0);
  });

  it('läuft weiter, wenn kein Stopp-Kriterium erfüllt ist', () => {
    const prevState = makeState({ month: 5, speed: 2 });
    setupStore(prevState);
    useUIStore.getState().setFastForwardActive(true);
    tickMock.mockReturnValue({ ...prevState, month: 6 });

    useGameStore.getState().gameTick();

    expect(useGameStore.getState().state.speed).toBe(2);
    expect(useUIStore.getState().fastForwardActive).toBe(true);
    expect(useUIStore.getState().toastQueue.length).toBe(0);
  });

  it('lässt normales Ticken ohne aktiven Vorlauf unangetastet', () => {
    const prevState = makeState({ month: 5, speed: 1 });
    setupStore(prevState);
    tickMock.mockReturnValue({ ...prevState, month: 6, speed: 1 });

    useGameStore.getState().gameTick();

    expect(useGameStore.getState().state.speed).toBe(1);
    expect(useUIStore.getState().toastQueue.length).toBe(0);
  });
});
