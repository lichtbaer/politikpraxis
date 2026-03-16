import type { GameState } from '../types';
import { scheduleEffects } from './economy';
import { addLog } from '../engine';

export function einbringen(state: GameState, lawId: string): GameState {
  const idx = state.gesetze.findIndex(g => g.id === lawId);
  if (idx === -1) return state;
  const law = state.gesetze[idx];
  if (law.status !== 'entwurf') return state;
  if (state.pk < 20) return state;

  const gesetze = state.gesetze.map((g, i) =>
    i === idx ? { ...g, status: 'aktiv' as const } : g,
  );

  return addLog(
    { ...state, pk: state.pk - 20, gesetze },
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
    const brOk = !law.tags.includes('land') || Math.random() > 0.5;
    if (brOk) {
      const gesetze = state.gesetze.map((g, i) =>
        i === idx ? { ...g, status: 'beschlossen' as const } : g,
      );
      let newState = scheduleEffects({ ...state, gesetze }, law);
      return addLog(newState, `${law.kurz} beschlossen — Wirkung in ${law.lag} Monaten`, 'g');
    } else {
      const gesetze = state.gesetze.map((g, i) =>
        i === idx ? { ...g, status: 'blockiert' as const, blockiert: 'bundesrat' as const } : g,
      );
      return addLog(
        { ...state, gesetze, speed: 0 },
        `${law.kurz}: Bundesrat blockiert! Ebenenwechsel möglich.`,
        'r',
      );
    }
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
