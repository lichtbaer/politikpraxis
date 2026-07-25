/**
 * Reducer-artige Unit-Tests für die wichtigsten gameStore-Aktionen
 * (Einbringen, Abstimmen, Lobbying, Save/Load/Reset) — ohne UI.
 *
 * Komplexität wird bewusst auf 1 gesetzt: Koalitionspartner-Widerstand,
 * Gegenfinanzierung und Bundesrat sind dort inaktiv (siehe core/systems/features.ts),
 * was die Fixtures klein und die Tests deterministisch hält.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './gameStore';
import { makeState, makeLaw } from '../core/test-helpers';
import { DEFAULT_CONTENT } from '../data/defaults/scenarios';
import { seedRng } from '../core/rng';
import type { SpielerParteiState } from '../core/types';

const DEFAULT_AUSRICHTUNG = { wirtschaft: 0, gesellschaft: 0, staat: 0 };

/** Setzt den Store auf einen kontrollierten Fixture-Zustand (Stufe 1, ein Testgesetz). */
function resetStoreWithLaw(lawOverrides: Parameters<typeof makeLaw>[0] = {}) {
  const law = makeLaw({ id: 'test_law', tags: ['bund'], ...lawOverrides });
  useGameStore.setState({
    state: makeState({ pk: 100, gesetze: [law] }),
    content: DEFAULT_CONTENT,
    complexity: 1,
    ausrichtung: DEFAULT_AUSRICHTUNG,
    phase: 'playing',
    cloudSaveId: null,
  });
  return law;
}

describe('gameStore — doEinbringen', () => {
  beforeEach(() => {
    seedRng(1);
    resetStoreWithLaw({ status: 'entwurf' });
  });

  it('bringt ein Gesetz im Entwurf-Status ein und zieht PK ab', () => {
    const pkBefore = useGameStore.getState().state.pk;
    useGameStore.getState().doEinbringen('test_law');
    const { state } = useGameStore.getState();
    const law = state.gesetze.find((g) => g.id === 'test_law');
    expect(law?.status).toBe('eingebracht');
    expect(state.pk).toBeLessThan(pkBefore);
    expect(state.eingebrachteGesetze?.some((e) => e.gesetzId === 'test_law')).toBe(true);
  });

  it('ändert nichts, wenn das Gesetz nicht im Entwurf-Status ist', () => {
    useGameStore.setState((prev) => ({
      state: {
        ...prev.state,
        gesetze: prev.state.gesetze.map((g) =>
          g.id === 'test_law' ? { ...g, status: 'aktiv' as const } : g,
        ),
      },
    }));
    const before = useGameStore.getState().state;
    useGameStore.getState().doEinbringen('test_law');
    const after = useGameStore.getState().state;
    expect(after.gesetze.find((g) => g.id === 'test_law')?.status).toBe('aktiv');
    expect(after.pk).toBe(before.pk);
  });

  it('bringt kein Gesetz ein, wenn nicht genug PK vorhanden ist', () => {
    useGameStore.setState((prev) => ({ state: { ...prev.state, pk: 1 } }));
    useGameStore.getState().doEinbringen('test_law');
    const { state } = useGameStore.getState();
    expect(state.gesetze.find((g) => g.id === 'test_law')?.status).toBe('entwurf');
    expect(state.pk).toBe(1);
  });
});

describe('gameStore — doAbstimmen', () => {
  beforeEach(() => {
    seedRng(1);
  });

  it('beschließt ein aktives Gesetz mit klarer Mehrheit (ja > 50%)', () => {
    resetStoreWithLaw({ status: 'aktiv', ja: 80, nein: 20 });
    useGameStore.getState().doAbstimmen('test_law');
    const { state } = useGameStore.getState();
    const law = state.gesetze.find((g) => g.id === 'test_law');
    expect(law?.status).toBe('beschlossen');
  });

  it('blockiert ein aktives Gesetz ohne Mehrheit (ja <= 50%)', () => {
    resetStoreWithLaw({ status: 'aktiv', ja: 30, nein: 70 });
    useGameStore.getState().doAbstimmen('test_law');
    const { state } = useGameStore.getState();
    const law = state.gesetze.find((g) => g.id === 'test_law');
    expect(law?.status).toBe('blockiert');
    expect(law?.blockiert).toBe('bundestag');
  });

  it('ändert nichts, wenn das Gesetz nicht aktiv ist (z.B. noch im Entwurf)', () => {
    resetStoreWithLaw({ status: 'entwurf', ja: 80 });
    const before = useGameStore.getState().state;
    useGameStore.getState().doAbstimmen('test_law');
    const after = useGameStore.getState().state;
    expect(after.gesetze.find((g) => g.id === 'test_law')?.status).toBe('entwurf');
    expect(after).toEqual(before);
  });
});

describe('gameStore — doLobbying', () => {
  beforeEach(() => {
    seedRng(1);
  });

  it('erhöht die Zustimmung eines Gesetzes und zieht PK ab', () => {
    resetStoreWithLaw({ status: 'entwurf', ja: 50, nein: 50, lobby_pk_kosten: 12, lobby_gain_range: { min: 2, max: 6 } });
    const pkBefore = useGameStore.getState().state.pk;
    useGameStore.getState().doLobbying('test_law');
    const { state } = useGameStore.getState();
    const law = state.gesetze.find((g) => g.id === 'test_law');
    expect(law?.ja).toBeGreaterThan(50);
    expect(law?.ja).toBeLessThanOrEqual(56);
    expect(law?.nein).toBe(100 - (law?.ja ?? 0));
    expect(state.pk).toBe(pkBefore - 12);
  });

  it('lobbyt nicht, wenn nicht genug PK vorhanden ist', () => {
    resetStoreWithLaw({ status: 'entwurf', ja: 50, lobby_pk_kosten: 12 });
    useGameStore.setState((prev) => ({ state: { ...prev.state, pk: 5 } }));
    useGameStore.getState().doLobbying('test_law');
    const { state } = useGameStore.getState();
    expect(state.gesetze.find((g) => g.id === 'test_law')?.ja).toBe(50);
    expect(state.pk).toBe(5);
  });
});

describe('gameStore — Save/Load/Reset', () => {
  beforeEach(() => {
    seedRng(1);
    resetStoreWithLaw({ status: 'entwurf' });
  });

  it('resetGame() setzt Phase, State und cloudSaveId zurück', () => {
    useGameStore.setState({ cloudSaveId: 'some-cloud-id' });
    useGameStore.getState().doEinbringen('test_law');
    expect(useGameStore.getState().phase).toBe('playing');

    useGameStore.getState().resetGame();

    const after = useGameStore.getState();
    expect(after.phase).toBe('onboarding');
    expect(after.cloudSaveId).toBeNull();
    expect(after.spielerPartei).toBeNull();
    // Frischer State: das Testgesetz existiert nicht mehr, echter Content wird geladen
    expect(after.state.gesetze.some((g) => g.id === 'test_law')).toBe(false);
    expect(after.state.month).toBe(1);
  });

  it('resetGame({ keepPartei: true }) behält die gewählte Partei', () => {
    const partei: SpielerParteiState = { id: 'sdp', kuerzel: 'SDP', farbe: '#000', name: 'Sozialdemokratische Partei' };
    useGameStore.setState({ spielerPartei: partei });

    useGameStore.getState().resetGame({ keepPartei: true });

    expect(useGameStore.getState().spielerPartei).toEqual(partei);
  });

  it('loadSave() übernimmt einen validen Spielstand', () => {
    const savedState = makeState({ pk: 42, month: 5 });
    useGameStore.getState().loadSave(savedState);
    const { state } = useGameStore.getState();
    expect(state.pk).toBe(42);
    expect(state.month).toBe(5);
  });

  it('loadSave() ignoriert einen ungültigen Spielstand (kein Objekt) und lässt den bisherigen State unangetastet', () => {
    const before = useGameStore.getState().state;
    // @ts-expect-error absichtlich kaputter Spielstand für den Fehlerpfad (validateGameState wirft nur bei Nicht-Objekten)
    useGameStore.getState().loadSave(null);
    expect(useGameStore.getState().state).toBe(before);
  });

  it('loadSaveFromFile() übernimmt Spielstand, Metadaten und wechselt in die Spielphase', () => {
    const savedState = makeState({ pk: 77, month: 9 });
    useGameStore.getState().loadSaveFromFile({
      version: '1',
      savedAt: new Date(2026, 0, 1).toISOString(),
      gameState: savedState,
      playerName: 'Test-Kanzlerin',
      complexity: 3,
      ausrichtung: { wirtschaft: 10, gesellschaft: -10, staat: 0 },
      spielerPartei: { id: 'gp', kuerzel: 'GP', farbe: '#0a0', name: 'Grüne Partei' },
      kanzlerGeschlecht: 'er',
      cloudSaveId: 'cloud-42',
    });

    const after = useGameStore.getState();
    expect(after.phase).toBe('playing');
    expect(after.state.pk).toBe(77);
    expect(after.state.month).toBe(9);
    expect(after.playerName).toBe('Test-Kanzlerin');
    expect(after.complexity).toBe(3);
    expect(after.cloudSaveId).toBe('cloud-42');
    expect(after.spielerPartei?.id).toBe('gp');
  });
});
