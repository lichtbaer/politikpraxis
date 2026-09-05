import type { GameState, ContentBundle } from '../../types';
import { addLog } from '../../log';
import { withPause, getAutoPauseLevel } from '../../eventPause';
import { featureActive } from '../features';
import { addZustOffset } from '../economics/economy';
import { clamp, MEDIEN_KLIMA_DEFAULT } from '../../constants';
import { berechneLegislaturBilanz } from '../election/wahlkampf';

/** #274: Monat der 100-Tage-Bilanz. */
export const HUNDERT_TAGE_BILANZ_MONAT = 3;

/**
 * #274: Sommerloch-Anker — jährlich wiederkehrendes, flaues Nachrichtenfenster.
 * Jahr 4 (Monat 43) wird bewusst ausgelassen, da dort bereits der Wahlkampf beginnt.
 */
export const SOMMERLOCH_MONATE = [7, 19, 31] as const;

/** #274: Monat der Halbzeitbilanz (Mitte der 48-monatigen Legislatur). */
export const HALBZEITBILANZ_MONAT = 24;

/** Ab diesem Aktivitäts-Score fällt die Presse-Bilanz positiv aus. */
export const AKTIVITAETS_SCHWELLE_HOCH = 6;
/** Bei diesem oder niedrigerem Score fällt die Presse-Bilanz negativ aus. */
export const AKTIVITAETS_SCHWELLE_NIEDRIG = 1;

/**
 * #274: Grobes Maß für "wie aktiv war die Regierung bisher" — Gesetze, die den
 * Entwurfsstatus verlassen haben (eingebracht/aktiv/beschlossen/...), plus
 * investiertes politisches Kapital. Bewusst einfach gehalten (kein neuer
 * State, nutzt vorhandene kumulative Felder).
 */
function berechneAktivitaetsScore(state: GameState): number {
  const aktivGesetze = state.gesetze.filter((g) => g.status !== 'entwurf').length;
  const pkVerbraucht = state.pkVerbrauchtGesamt ?? 0;
  return aktivGesetze * 2 + pkVerbraucht / 5;
}

/**
 * #274: 100-Tage-Bilanz (Monat 3) — erster fester Dramaturgie-Anker. Presse
 * bewertet den Regierungsstart anhand der bisherigen Aktivität und wirkt sich
 * mit einem (leicht abklingenden) Medienklima-/Zustimmungs-Impuls aus. Der
 * Impuls wird unabhängig davon angewendet, ob das begleitende Info-Event im
 * Content vorhanden ist (z. B. in der Balance-Simulation ohne Wahlkampf-Content).
 */
export function checkHundertTageBilanz(
  state: GameState,
  content: ContentBundle,
  complexity: number,
): GameState {
  if (!featureActive(complexity, 'dramaturgie_anker')) return state;
  if (state.month !== HUNDERT_TAGE_BILANZ_MONAT) return state;
  if (state.firedEvents.includes('hundert_tage_bilanz')) return state;
  if (state.activeEvent) return state;

  const score = berechneAktivitaetsScore(state);
  let medienDelta = 0;
  let zustDelta = 0;
  let logMsg: string;
  if (score >= AKTIVITAETS_SCHWELLE_HOCH) {
    medienDelta = 5;
    zustDelta = 2;
    logMsg = '100-Tage-Bilanz: Die Presse lobt einen tatkräftigen Regierungsstart.';
  } else if (score <= AKTIVITAETS_SCHWELLE_NIEDRIG) {
    medienDelta = -5;
    zustDelta = -2;
    logMsg = '100-Tage-Bilanz: Die Presse kritisiert einen zögerlichen Regierungsstart.';
  } else {
    logMsg = '100-Tage-Bilanz: Die Presse zieht eine gemischte erste Bilanz.';
  }

  let next: GameState = {
    ...state,
    medienKlima: clamp(Math.round((state.medienKlima ?? MEDIEN_KLIMA_DEFAULT) + medienDelta), 0, 100),
    zustOffsets: zustDelta !== 0
      ? (['arbeit', 'mitte', 'prog'] as const).reduce(
          (offs, segment) => addZustOffset(offs, segment, zustDelta),
          state.zustOffsets,
        )
      : state.zustOffsets,
    firedEvents: [...state.firedEvents, 'hundert_tage_bilanz'],
  };
  next = addLog(next, logMsg, medienDelta > 0 ? 'g' : medienDelta < 0 ? 'r' : 'b');

  const ev = content.events?.find((e) => e.id === 'hundert_tage_bilanz');
  if (ev) {
    next = { ...next, activeEvent: ev, ...withPause(next, getAutoPauseLevel(ev)) };
  }
  return next;
}

/**
 * #274: Sommerloch (jährlich, Monat 7/19/31) — an Stelle eines regulären
 * Zufalls-Events tritt ein flaues Boulevard-/Skandal-Fenster: leichter,
 * bewusst kleiner Medienklima-Dämpfer (Sommerlochthemen verdrängen
 * substanzielle Berichterstattung), damit reguläre Events diesen Monat
 * effektiv ausbleiben, ohne die Balance spürbar zu verschieben.
 */
export function checkSommerloch(
  state: GameState,
  content: ContentBundle,
  complexity: number,
): GameState {
  if (!featureActive(complexity, 'dramaturgie_anker')) return state;
  const idx = SOMMERLOCH_MONATE.indexOf(state.month as (typeof SOMMERLOCH_MONATE)[number]);
  if (idx === -1) return state;
  const eventId = `sommerloch_${idx + 1}`;
  if (state.firedEvents.includes(eventId)) return state;
  if (state.activeEvent) return state;

  const medienDelta = -2;
  let next: GameState = {
    ...state,
    medienKlima: clamp(Math.round((state.medienKlima ?? MEDIEN_KLIMA_DEFAULT) + medienDelta), 0, 100),
    firedEvents: [...state.firedEvents, eventId],
  };
  next = addLog(next, 'Sommerloch: Die Presse füllt die Nachrichtenflaute mit Boulevardthemen.', 'b');

  const ev = content.events?.find((e) => e.id === eventId);
  if (ev) {
    next = { ...next, activeEvent: ev, ...withPause(next, getAutoPauseLevel(ev)) };
  }
  return next;
}

/**
 * #274: Halbzeitbilanz (Monat 24) — Midterm-Stimmungstest analog zur
 * Wahlkampf-Zwischenbilanz. Nutzt dieselbe Bilanz-Berechnung wie das
 * Wahlkampf-Ende (`berechneLegislaturBilanz`), damit die Bewertung auf
 * denselben Kriterien (Reformstärke, Stabilität, Koalitionslage) beruht.
 * Wirkt sich — je nach Ausfall — auf Medienklima und Koalitionsbeziehung aus.
 */
export function checkHalbzeitbilanz(
  state: GameState,
  content: ContentBundle,
  complexity: number,
): GameState {
  if (!featureActive(complexity, 'dramaturgie_anker')) return state;
  if (state.month !== HALBZEITBILANZ_MONAT) return state;
  if (state.firedEvents.includes('halbzeitbilanz')) return state;
  if (state.activeEvent) return state;

  const bilanz = berechneLegislaturBilanz(state, content);
  const positiv = bilanz.stabilitaet === 'stabil' && bilanz.reformStaerke !== 'schwach';
  const negativ = bilanz.stabilitaet === 'krise'
    || (bilanz.reformStaerke === 'schwach' && bilanz.koalitionsBilanz === 'kritisch');

  let medienDelta = 0;
  let koalitionsDelta = 0;
  let logMsg: string;
  if (positiv) {
    medienDelta = 4;
    koalitionsDelta = 3;
    logMsg = 'Halbzeitbilanz: Kommentatoren loben eine stabile, aktive Regierungsarbeit.';
  } else if (negativ) {
    medienDelta = -4;
    koalitionsDelta = -3;
    logMsg = 'Halbzeitbilanz: Die Zwischenbilanz fällt kritisch aus — Stillstand und Reibung prägen das Bild.';
  } else {
    logMsg = 'Halbzeitbilanz: Gemischte Zwischenbilanz nach der Hälfte der Legislatur.';
  }

  let next: GameState = {
    ...state,
    halbzeitBilanz: bilanz,
    medienKlima: clamp(Math.round((state.medienKlima ?? MEDIEN_KLIMA_DEFAULT) + medienDelta), 0, 100),
    koalitionspartner: state.koalitionspartner && koalitionsDelta !== 0
      ? { ...state.koalitionspartner, beziehung: clamp(state.koalitionspartner.beziehung + koalitionsDelta, 0, 100) }
      : state.koalitionspartner,
    firedEvents: [...state.firedEvents, 'halbzeitbilanz'],
  };
  next = addLog(next, logMsg, medienDelta > 0 ? 'g' : medienDelta < 0 ? 'r' : 'b');

  const ev = content.events?.find((e) => e.id === 'halbzeitbilanz');
  if (ev) {
    next = { ...next, activeEvent: ev, ...withPause(next, getAutoPauseLevel(ev)) };
  }
  return next;
}
