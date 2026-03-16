import type { GameState, BundesratLand } from '../types';
import { addLog } from '../engine';

export function lobbyLand(state: GameState, landId: string): GameState {
  if (state.pk < 15) return state;

  const idx = state.bundesrat.findIndex(l => l.id === landId);
  if (idx === -1) return state;
  const land = state.bundesrat[idx];

  const moodGain = Math.floor(Math.random() * 2) + 1;
  const bundesrat = state.bundesrat.map((l, i) =>
    i === idx ? { ...l, mood: Math.min(4, l.mood + moodGain) } : l,
  );

  return addLog(
    { ...state, pk: state.pk - 15, bundesrat },
    `Lobbying bei MP ${land.mp} (${land.name}): Stimmung +${moodGain}`,
    '',
  );
}

export function calculateBundesratMajority(bundesrat: BundesratLand[]): {
  jaVotes: number;
  neinVotes: number;
  total: number;
} {
  let jaVotes = 0;
  let neinVotes = 0;

  for (const land of bundesrat) {
    if (land.alignment === 'koalition' || land.mood >= 3) {
      jaVotes += land.votes;
    } else if (land.alignment === 'opposition' && land.mood < 2) {
      neinVotes += land.votes;
    } else {
      if (land.mood >= 2) jaVotes += land.votes;
      else neinVotes += land.votes;
    }
  }

  return { jaVotes, neinVotes, total: jaVotes + neinVotes };
}
