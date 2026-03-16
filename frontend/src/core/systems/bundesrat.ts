import type { GameState, BundesratLand, BundesratFraktion } from '../types';
import { addLog } from '../engine';

/**
 * Berechnet die Bundesrat-Mehrheit für ein Gesetz.
 * Jede Fraktion stimmt als Block; Mehrheit ab 9 von 16 Ländern.
 */
export function calcBundesratMehrheit(
  fraktionen: BundesratFraktion[],
  _gesetzeId?: string,
): { ja: number; nein: number; mehrheit: boolean } {
  let ja = 0;
  let nein = 0;

  for (const f of fraktionen) {
    const effBereitschaft = f.basisBereitschaft + f.beziehung * 0.2;
    const stimmtJa = effBereitschaft > 50;
    const laenderCount = f.laender.length;
    if (stimmtJa) {
      ja += laenderCount;
    } else {
      nein += laenderCount;
    }
  }

  return { ja, nein, mehrheit: ja >= 9 };
}

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
