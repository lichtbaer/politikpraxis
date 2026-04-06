import type { GameState, GameEvent, Law, KPI, ContentBundle } from '../types';
import { withPause } from '../eventPause';
import { addLog } from '../engine';
import { featureActive } from './features';
import { clamp } from '../constants';
import { getGesetzIdeologie } from './koalition';
import { adjustMedienKlimaGlobal } from './medienklima';
import { nextRandom } from '../rng';

/**
 * Normenkontrolle beim Bundesverfassungsgericht (Art. 93 GG).
 *
 * Nach Beschluss eines Gesetzes kann die Opposition oder eine
 * Bundesrat-Fraktion Klage einreichen. Das Verfahren dauert 4-8 Monate.
 */

/** Berechnet die Klage-Wahrscheinlichkeit (0–40%) für ein beschlossenes Gesetz. */
export function berechneKlageWahrscheinlichkeit(
  law: Law,
  oppositionStaerke: number,
  bundesratFraktionen: { beziehung: number }[],
): number {
  let prob = 5; // Basis

  // Ideologische Extremität: Achsenwert > 60 → +15%
  const ideo = getGesetzIdeologie(law);
  if (Math.abs(ideo.wirtschaft) > 60 || Math.abs(ideo.gesellschaft) > 60 || Math.abs(ideo.staat) > 60) {
    prob += 15;
  }

  // Oppositions-Stärke: staerke / 10
  prob += Math.floor(oppositionStaerke / 10);

  // Bundesrat-Fraktion mit Beziehung < 25: +10%
  if (bundesratFraktionen.some(f => f.beziehung < 25)) {
    prob += 10;
  }

  return Math.min(40, prob);
}

/** Baut das Normenkontroll-Event mit 3 Reaktionen */
function buildNormenkontrollEvent(law: Law): GameEvent {
  return {
    id: `normenkontrolle_${law.id}`,
    type: 'warn',
    icon: '⚖️',
    typeLabel: 'Bundesverfassungsgericht',
    title: `Normenkontrollklage: ${law.kurz}`,
    quote: '„Das Gericht wird die Verfassungsmäßigkeit des Gesetzes prüfen." — Präsidentin des BVerfG',
    context: `Die Opposition hat eine abstrakte Normenkontrolle gegen das ${law.kurz} beim Bundesverfassungsgericht eingereicht. Das Verfahren wird mehrere Monate dauern. Das Gesetz bleibt vorerst in Kraft.`,
    ticker: `BVerfG: Normenkontrollklage gegen ${law.kurz}`,
    choices: [
      {
        label: 'Nachbesserung vorbereiten',
        desc: 'Juristen beauftragen, eine verfassungskonforme Nachbesserung auszuarbeiten — schützt bei teilweiser Verfassungswidrigkeit.',
        cost: 12,
        type: 'primary',
        effect: {},
        log: `Nachbesserungsentwurf für ${law.kurz} in Arbeit.`,
        key: 'normenkontrolle_nachbesserung',
      },
      {
        label: 'Gelassen akzeptieren',
        desc: 'Öffentlich Vertrauen in die Verfassungsmäßigkeit bekunden. Bei positivem Urteil: Medienklima +3.',
        cost: 0,
        type: 'safe',
        effect: {},
        log: `Regierung zeigt Vertrauen in Verfassungsmäßigkeit von ${law.kurz}.`,
        key: 'normenkontrolle_akzeptieren',
      },
      {
        label: 'Urteil öffentlich kritisieren',
        desc: 'Die Klage als politisch motiviert darstellen. Polarisiert: progressive Milieus unterstützen, traditionelle kritisieren.',
        cost: 5,
        type: 'danger',
        effect: {},
        medienklima_delta: -5,
        log: `Regierung kritisiert Normenkontrollklage als parteipolitisch.`,
        key: 'normenkontrolle_kritisieren',
      },
    ],
    auto_pause: 'always',
    lawId: law.id,
  };
}

/**
 * Prüft nach Gesetzesbeschluss, ob eine Normenkontrollklage eingereicht wird.
 * Wird im Engine-Tick nach Beschluss aufgerufen.
 */
export function checkNormenkontrollKlage(
  state: GameState,
  law: Law,
  complexity: number,
): GameState {
  if (!featureActive(complexity, 'normenkontrolle')) return state;
  if (state.activeEvent) return state;

  const oppStaerke = state.opposition?.staerke ?? 40;
  const prob = berechneKlageWahrscheinlichkeit(law, oppStaerke, state.bundesratFraktionen);

  // Würfelwurf
  if (nextRandom() * 100 >= prob) return state;

  // Verfahrensdauer: 4-8 Monate
  const dauer = 4 + Math.floor(nextRandom() * 5);
  const event = buildNormenkontrollEvent(law);

  const verfahren = [...(state.normenkontrollVerfahren ?? []), {
    gesetzId: law.id,
    klagemonat: state.month,
    urteilMonat: state.month + dauer,
  }];

  let s: GameState = {
    ...state,
    activeEvent: event,
    normenkontrollVerfahren: verfahren,
    ...withPause(state),
  };

  s = addLog(s, `Normenkontrollklage gegen ${law.kurz} — Urteil in ${dauer} Monaten`, 'r');
  return s;
}

/** Urteilsergebnisse: verfassungskonform, teilweise, verfassungswidrig */
type Urteil = 'konform' | 'teilweise' | 'widrig';

function wuerfleUrteil(): Urteil {
  const roll = nextRandom() * 100;
  if (roll < 40) return 'konform';
  if (roll < 80) return 'teilweise';
  return 'widrig';
}

/**
 * Monatlicher Tick: Prüft ob Normenkontroll-Verfahren abgeschlossen werden.
 */
export function tickNormenkontrolle(
  state: GameState,
  complexity: number,
  content?: ContentBundle,
): GameState {
  if (!featureActive(complexity, 'normenkontrolle')) return state;

  const verfahren = state.normenkontrollVerfahren ?? [];
  if (verfahren.length === 0) return state;

  const laufend: typeof verfahren = [];
  let s = state;

  for (const v of verfahren) {
    if (s.month < v.urteilMonat) {
      laufend.push(v);
      continue;
    }

    // Urteil fällen
    const urteil = wuerfleUrteil();
    const law = s.gesetze.find(g => g.id === v.gesetzId);
    if (!law) continue;

    const gesetzName = law.kurz;

    if (urteil === 'konform') {
      // Verfassungskonform: Medienklima +5, Opposition -5
      const opp = s.opposition
        ? { ...s.opposition, staerke: clamp(s.opposition.staerke - 5, 0, 100) }
        : undefined;
      // Spieler-Bonus bei "akzeptieren"-Reaktion
      const akzeptiertBonus = v.spielerReaktion === 'akzeptieren' ? 3 : 0;
      s = adjustMedienKlimaGlobal(s, 5, complexity, content);
      if (akzeptiertBonus) {
        s = adjustMedienKlimaGlobal(s, akzeptiertBonus, complexity, content);
      }
      s = { ...s, ...(opp && { opposition: opp }) };
      s = addLog(s, `BVerfG: ${gesetzName} ist verfassungskonform`, 'g');

    } else if (urteil === 'teilweise') {
      // Teilweise verfassungswidrig: Effekte um 50% reduziert (außer bei Nachbesserung)
      if (v.spielerReaktion !== 'nachbesserung') {
        // Effekte rückgängig machen (50% der Original-Effekte negieren)
        const pending = [...s.pending];
        for (const [key, val] of Object.entries(law.effekte)) {
          if (typeof val === 'number' && val !== 0) {
            pending.push({
              month: s.month + 1,
              key: key as keyof KPI,
              delta: -(val * 0.5),
              label: `BVerfG-Urteil: ${gesetzName} (Nachbesserung nötig)`,
              gesetzId: law.id,
            });
          }
        }
        s = { ...s, pending };
        s = addLog(s, `BVerfG: ${gesetzName} teilweise verfassungswidrig — Wirkung halbiert`, 'r');
      } else {
        s = addLog(s, `BVerfG: ${gesetzName} teilweise verfassungswidrig — Nachbesserung greift`, 'b');
      }

    } else {
      // Verfassungswidrig: Alle Effekte rückgängig, Medienklima -12
      const pending = [...s.pending];
      for (const [key, val] of Object.entries(law.effekte)) {
        if (typeof val === 'number' && val !== 0) {
          pending.push({
            month: s.month + 1,
            key: key as keyof KPI,
            delta: -val,
            label: `BVerfG: ${gesetzName} aufgehoben`,
            gesetzId: law.id,
          });
        }
      }
      s = { ...s, pending };
      s = adjustMedienKlimaGlobal(s, -12, complexity, content);
      s = addLog(s, `BVerfG: ${gesetzName} für verfassungswidrig erklärt — Gesetz aufgehoben`, 'r');
    }

    // Kritisieren-Effekt: Milieus polarisiert
    if (v.spielerReaktion === 'kritisieren') {
      const mz = { ...(s.milieuZustimmung ?? {}) };
      if (mz['postmaterielle'] != null) mz['postmaterielle'] = clamp(mz['postmaterielle'] + 3, 0, 100);
      if (mz['traditionelle'] != null) mz['traditionelle'] = clamp(mz['traditionelle'] - 3, 0, 100);
      s = { ...s, milieuZustimmung: mz };
    }
  }

  return { ...s, normenkontrollVerfahren: laufend };
}

/**
 * Speichert die Spieler-Reaktion auf eine Normenkontrollklage.
 * Wird beim Event-Resolve aufgerufen.
 */
export function setNormenkontrollReaktion(
  state: GameState,
  gesetzId: string,
  reaktion: 'nachbesserung' | 'akzeptieren' | 'kritisieren',
): GameState {
  const verfahren = (state.normenkontrollVerfahren ?? []).map(v =>
    v.gesetzId === gesetzId ? { ...v, spielerReaktion: reaktion } : v,
  );
  return { ...state, normenkontrollVerfahren: verfahren };
}
