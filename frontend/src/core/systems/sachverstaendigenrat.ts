import type { GameState, GameEvent, ContentBundle } from '../types';
import { withPause } from '../eventPause';
import { addLog } from '../engine';
import { featureActive } from './features';
import { clamp } from '../constants';

/** SVR-Gutachten-Noten */
export type SVRNote = 'A' | 'B' | 'C' | 'D' | 'F';

/** Monate in denen SVR-Gutachten erscheinen */
const GUTACHTEN_MONATE = [6, 18, 30, 42];

/** Nächsten Gutachten-Monat ab aktuellem Monat bestimmen */
export function naechsterGutachtenMonat(currentMonth: number): number {
  return GUTACHTEN_MONATE.find(m => m > currentMonth) ?? 99;
}

/**
 * Berechnet die SVR-Note anhand der KPI-Entwicklung der letzten 12 Monate.
 * Vergleicht erste und letzte Werte in kpiHistory.
 * "Verbessert" bedeutet: AL gesenkt, HH erhöht, GI gesenkt, ZF erhöht.
 */
export function berechneSVRNote(kpiHistory: { al: number[]; hh: number[]; gi: number[]; zf: number[] }): SVRNote {
  let verbessert = 0;

  for (const key of ['al', 'hh', 'gi', 'zf'] as const) {
    const arr = kpiHistory[key];
    if (arr.length < 2) continue;
    const first = arr[0];
    const last = arr[arr.length - 1];
    const delta = last - first;

    // AL und GI: niedrigerer Wert = besser
    if (key === 'al' || key === 'gi') {
      if (delta < -0.3) verbessert++;
    } else {
      // HH und ZF: höherer Wert = besser
      if (delta > 0.3) verbessert++;
    }
  }

  if (verbessert >= 4) return 'A';
  if (verbessert >= 3) return 'B';
  if (verbessert >= 2) return 'C';
  if (verbessert >= 1) return 'D';
  return 'F';
}

/** Medienklima-Effekt je Note (vor Spieler-Modifikation) */
function medienEffekt(note: SVRNote): number {
  switch (note) {
    case 'A': return 8;
    case 'B': return 4;
    case 'C': return 0;
    case 'D': return -6;
    case 'F': return -12;
  }
}

/** Baut das SVR-Event mit 3 Optionen */
function buildSVREvent(note: SVRNote): GameEvent {
  const noteLabels: Record<SVRNote, string> = {
    A: 'hervorragend',
    B: 'positiv',
    C: 'gemischt',
    D: 'kritisch',
    F: 'vernichtend',
  };

  const noteQuotes: Record<SVRNote, string> = {
    A: '„Die wirtschaftspolitischen Maßnahmen der Bundesregierung zeigen nachhaltige Wirkung." — Prof. Dr. Weber, Vorsitzende des SVR',
    B: '„Die Richtung stimmt, aber es bleibt Handlungsbedarf." — Prof. Dr. Weber, Vorsitzende des SVR',
    C: '„Die Bilanz fällt durchwachsen aus — Licht und Schatten." — Prof. Dr. Weber, Vorsitzende des SVR',
    D: '„Die Bundesregierung muss dringend nachjustieren." — Prof. Dr. Weber, Vorsitzende des SVR',
    F: '„Ein wirtschaftspolitisches Armutszeugnis. Die Regierung hat auf ganzer Linie versagt." — Prof. Dr. Weber, Vorsitzende des SVR',
  };

  return {
    id: `svr_gutachten_${note}`,
    type: note === 'A' || note === 'B' ? 'good' : note === 'C' ? 'info' : 'danger',
    icon: '📊',
    typeLabel: 'Sachverständigenrat',
    title: `Jahresgutachten: Note ${note} — ${noteLabels[note]}`,
    quote: noteQuotes[note],
    context: `Der Sachverständigenrat zur Begutachtung der gesamtwirtschaftlichen Entwicklung hat sein Jahresgutachten vorgelegt. Die „Fünf Weisen" bewerten die Wirtschaftspolitik der Bundesregierung als ${noteLabels[note]}.`,
    ticker: `SVR-Gutachten veröffentlicht: Note ${note}`,
    choices: [
      {
        label: 'Reformankündigung',
        desc: 'Öffentlich neue Wirtschaftsreformen ankündigen, um die Bewertung abzufedern.',
        cost: 15,
        type: 'primary',
        effect: {},
        medienklima_delta: Math.min(medienEffekt(note) + 6, 8),
        log: 'Reformankündigung als Reaktion auf SVR-Gutachten.',
        key: 'svr_reform',
      },
      {
        label: 'Gutachten ignorieren',
        desc: note === 'D' || note === 'F'
          ? 'Keine Reaktion — aber bei negativem Urteil verdoppelt sich der Medienschaden.'
          : 'Keine offizielle Reaktion auf das Gutachten.',
        cost: 0,
        type: note === 'D' || note === 'F' ? 'danger' : 'safe',
        effect: {},
        medienklima_delta: note === 'D' || note === 'F' ? medienEffekt(note) * 2 : medienEffekt(note),
        log: 'SVR-Gutachten ohne Reaktion zur Kenntnis genommen.',
        key: 'svr_ignorieren',
      },
      {
        label: 'Gegengutachten beauftragen',
        desc: 'Ein unabhängiges Gegengutachten in Auftrag geben, um die Medienwirkung abzuschwächen.',
        cost: 10,
        type: 'safe',
        effect: {},
        medienklima_delta: Math.round(medienEffekt(note) * 0.5),
        log: 'Gegengutachten beauftragt — Medienwirkung abgeschwächt.',
        key: 'svr_gegen',
      },
    ],
    auto_pause: 'always',
  };
}

/**
 * Prüft im monatlichen Tick, ob ein SVR-Gutachten fällig ist.
 * Erzeugt ein Event mit 3 Reaktionsmöglichkeiten.
 */
export function checkSachverstaendigenrat(
  state: GameState,
  _content: ContentBundle,
  complexity: number,
): GameState {
  if (!featureActive(complexity, 'sachverstaendigenrat')) return state;
  if (state.activeEvent) return state;

  const svr = state.sachverstaendigenrat ?? { naechstesGutachtenMonat: GUTACHTEN_MONATE[0] };
  if (state.month < svr.naechstesGutachtenMonat) return state;

  // KPI-History muss vorhanden sein
  const hist = state.kpiHistory;
  if (!hist || hist.al.length < 2) return state;

  const note = berechneSVRNote(hist);
  const event = buildSVREvent(note);

  // PK-Bonus bei Note A
  const pkBonus = note === 'A' ? 5 : 0;

  // Opposition-Effekt bei schlechter Note
  const oppDelta = note === 'D' ? 5 : note === 'F' ? 8 : 0;
  const opp = state.opposition
    ? { ...state.opposition, staerke: clamp(state.opposition.staerke + oppDelta, 0, 100) }
    : undefined;

  const nextMonth = naechsterGutachtenMonat(state.month);

  let s: GameState = {
    ...state,
    activeEvent: event,
    pk: Math.min(150, state.pk + pkBonus),
    sachverstaendigenrat: {
      naechstesGutachtenMonat: nextMonth,
      letztesErgebnis: note,
      letzterMonat: state.month,
    },
    ...(opp && { opposition: opp }),
    ...withPause(state),
  };

  s = addLog(s, `SVR-Jahresgutachten: Note ${note}`, note === 'A' || note === 'B' ? 'g' : note === 'C' ? 'b' : 'r');

  return s;
}
