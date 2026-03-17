import type { GameState } from '../types';
import { scheduleEffects } from './economy';
import { addLog } from '../engine';

export function einbringen(state: GameState, lawId: string, options?: { pkRabatt?: number }): GameState {
  const idx = state.gesetze.findIndex(g => g.id === lawId);
  if (idx === -1) return state;
  const law = state.gesetze[idx];
  if (law.status !== 'entwurf') return state;

  const baseCost = 20;
  const rabatt = options?.pkRabatt ?? 0;
  const cost = Math.max(1, Math.round(baseCost * (1 - rabatt)));
  if (state.pk < cost) return state;

  const gesetze = state.gesetze.map((g, i) =>
    i === idx ? { ...g, status: 'aktiv' as const } : g,
  );

  return addLog(
    { ...state, pk: state.pk - cost, gesetze },
    `${law.kurz} in Bundestag eingebracht`,
    'hi',
  );
}

export function lobbying(state: GameState, lawId: string): GameState {
  const idx = state.gesetze.findIndex(g => g.id === lawId);
  if (idx === -1) return state;
  if (state.pk < 12) return state;

  const gain = Math.floor(Math.random() * 5) + 2;
  const gesetze = state.gesetze.map((g, i) => {
    if (i !== idx) return g;
    const ja = Math.min(63, g.ja + gain);
    return { ...g, ja, nein: 100 - ja };
  });

  let newState: GameState = { ...state, pk: state.pk - 12, gesetze };

  if (['ee', 'wb', 'bp'].includes(lawId)) {
    const chars = newState.chars.map(c => {
      if (c.id === 'fm' && c.mood > 0) return { ...c, mood: c.mood - 1 };
      return c;
    });
    newState = { ...newState, chars };
  }

  return addLog(newState, `Lobbying ${gesetze[idx].kurz}: Zustimmung steigt +${gain}%`, '');
}

export function abstimmen(state: GameState, lawId: string): GameState {
  const idx = state.gesetze.findIndex(g => g.id === lawId);
  if (idx === -1) return state;
  const law = state.gesetze[idx];
  if (law.status !== 'aktiv') return state;

  if (law.ja > 50) {
    if (!law.tags.includes('land')) {
      const gesetze = state.gesetze.map((g, i) =>
        i === idx ? { ...g, status: 'beschlossen' as const } : g,
      );
      const lawForEffects = { effekte: law.effekte as Record<string, number>, lag: law.lag, kurz: law.kurz };
      let newState = scheduleEffects({ ...state, gesetze }, lawForEffects);
      return addLog(newState, `${law.kurz} beschlossen — Wirkung in ${law.lag} Monaten`, 'g');
    }
    // Land-Gesetz: BT passed → 3 Monate bis BR-Abstimmung, Lobbying-Fenster
    const gesetze = state.gesetze.map((g, i) =>
      i === idx
        ? { ...g, status: 'bt_passed' as const, brVoteMonth: state.month + 3, lobbyFraktionen: {} }
        : g,
    );
    return addLog(
      { ...state, gesetze },
      `${law.kurz} durch Bundestag — Bundesratsabstimmung in 3 Monaten. Lobbying möglich.`,
      'g',
    );
  } else {
    const gesetze = state.gesetze.map((g, i) =>
      i === idx ? { ...g, status: 'blockiert' as const, blockiert: 'bundestag' as const } : g,
    );
    return addLog(
      { ...state, gesetze, speed: 0 },
      `${law.kurz}: Bundestag-Mehrheit verfehlt (${law.ja}%)`,
      'r',
    );
  }
}
