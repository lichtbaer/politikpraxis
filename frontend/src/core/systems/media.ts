import type { GameState } from '../types';
import { addLog } from '../engine';

export type MilieuKey = 'arbeit' | 'mitte' | 'prog';

const MILIEU_LABELS: Record<MilieuKey, string> = {
  arbeit: 'Arbeitsmilieu',
  mitte: 'Mitte',
  prog: 'Progressive',
};

export function medienkampagne(state: GameState, milieu: MilieuKey): GameState {
  if (state.pk < 10) return state;

  const gain = Math.floor(Math.random() * 4) + 2;
  const zust = { ...state.zust };
  zust[milieu] = Math.min(90, zust[milieu] + gain);

  return addLog(
    { ...state, pk: state.pk - 10, zust },
    `Medienkampagne: ${MILIEU_LABELS[milieu]} +${gain}%`,
    'hi',
  );
}
