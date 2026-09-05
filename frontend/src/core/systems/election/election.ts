import type { GameState, GameEvent, ContentBundle } from '../../types';
import { withPause } from '../../eventPause';
import {
  DEFAULT_ELECTION_THRESHOLD,
  LEGISLATUR_MONATE,
  MIN_KOALITION_FORTGANG,
  MISSTRAUENSVOTUM_MONATE,
  MISSTRAUENSVOTUM_EVENT_MONATE,
  MISSTRAUENSVOTUM_VERTRAUENSFRAGE_PK,
  MISSTRAUENSVOTUM_KOALITIONSRUNDE_PK,
  MISSTRAUENSVOTUM_OPPOSITION_SCHWELLE,
  MISSTRAUENSVOTUM_KOALITION_SCHWELLE,
} from '../../constants';
import { featureActive } from '../features';
import { nextRandom } from '../../rng';
import { berechneSpielzielErgebnis, berechneWahlbonus, istLegislaturErfolg } from '../../spielziel';
import { finalisiereLegislaturBilanzAmSpielende } from './wahlkampf';

/** Schwelle für Misstrauensvotum: Zustimmung unter diesem Wert zählt als "kritisch niedrig" */
const MISSTRAUENSVOTUM_APPROVAL_THRESHOLD = 20;

/**
 * Art. 67 GG: Ein konstruktives Misstrauensvotum braucht real eine eigene
 * Kanzlermehrheit im Bundestag — primärer Faktor ist daher der
 * Oppositions-Sitzanteil kombiniert mit einer instabilen Koalition (aus der
 * genug Abgeordnete abweichen könnten). Kritisch niedrige Zustimmungswerte
 * allein reichen nicht aus; sie zählen nur als sekundärer, verstärkender
 * Faktor, wenn zumindest einer der beiden primären Faktoren bereits vorliegt
 * (SMA-277).
 */
export function hatMisstrauensvotumMehrheitsbasis(state: GameState): boolean {
  const oppositionStaerke = state.opposition?.staerke ?? 40;
  const koalitionInstabil = state.coalition < MISSTRAUENSVOTUM_KOALITION_SCHWELLE;
  const oppositionStark = oppositionStaerke >= MISSTRAUENSVOTUM_OPPOSITION_SCHWELLE;

  if (oppositionStark && koalitionInstabil) return true;

  const approvalKritisch = state.zust.g < MISSTRAUENSVOTUM_APPROVAL_THRESHOLD;
  return approvalKritisch && (oppositionStark || koalitionInstabil);
}

/**
 * Art. 67 GG: Konstruktives Misstrauensvotum.
 * Generiert ein interaktives Event das dem Spieler Verteidigungsoptionen bietet.
 * Wird ausgelöst nach MISSTRAUENSVOTUM_EVENT_MONATE aufeinanderfolgenden Monaten
 * mit einer realen Mehrheitsbasis für die Opposition (siehe hatMisstrauensvotumMehrheitsbasis).
 */
export function buildMisstrauensvotumEvent(state: GameState): GameEvent {
  const approvalPct = Math.round(state.zust.g);
  const coalitionPct = state.coalition;
  const oppositionPct = state.opposition?.staerke ?? 40;

  return {
    id: 'konstruktives_misstrauensvotum',
    type: 'crisis',
    icon: '⚖️',
    typeLabel: 'Verfassungskrise',
    title: 'Konstruktives Misstrauensvotum (Art. 67 GG)',
    quote: '„Die Opposition hat einen Nachfolger benannt. Der Bundestag stimmt morgen über Ihre Ablösung ab."',
    context: `Nach Art. 67 GG braucht die Opposition eine eigene Mehrheit im Bundestag: Ihr Sitzanteil liegt bei ${oppositionPct}%, Ihre Koalition zeigt Risse (Stabilität: ${coalitionPct}%) — genug Abgeordnete könnten abweichen. Ihre Zustimmungswerte liegen zudem seit Monaten unter ${MISSTRAUENSVOTUM_APPROVAL_THRESHOLD}% (aktuell: ${approvalPct}%). Die Opposition hat einen Gegenkandidaten aufgestellt. Sie haben drei Möglichkeiten.`,
    ticker: 'Misstrauensvotum im Bundestag — Kanzlerschaft in Gefahr',
    auto_pause: 'always',
    choices: [
      {
        label: 'Koalition stabilisieren',
        desc: `Intensive Gespräche mit Fraktion und Koalitionspartner führen. Kostet ${MISSTRAUENSVOTUM_KOALITIONSRUNDE_PK} PK. Koalitionsstabilität steigt, Counter wird zurückgesetzt.`,
        cost: MISSTRAUENSVOTUM_KOALITIONSRUNDE_PK,
        type: 'primary',
        effect: {
          zf: 3,
        },
        charMood: { kz: 1, fm: 1 },
        koalitionspartnerBeziehung: 10,
        log: 'Koalition stabilisiert — Misstrauensvotum abgewendet.',
        key: 'stabilisieren',
      },
      {
        label: 'Vertrauensfrage stellen (Art. 68 GG)',
        desc: `Offensive Gegenmaßnahme: Sie stellen selbst die Vertrauensfrage. Kostet ${MISSTRAUENSVOTUM_VERTRAUENSFRAGE_PK} PK. Erfolg hängt von Koalitionsstabilität ab (aktuell: ${coalitionPct}%). Bei Erfolg: starke Position. Bei Scheitern: Spielende.`,
        cost: MISSTRAUENSVOTUM_VERTRAUENSFRAGE_PK,
        type: 'danger',
        effect: {},
        log: 'Vertrauensfrage gestellt — Ausgang ungewiss.',
        key: 'vertrauensfrage',
      },
      {
        label: 'Rücktritt',
        desc: 'Sie treten zurück und überlassen die Regierung dem Nachfolger. Spielende.',
        cost: 0,
        type: 'danger',
        effect: {},
        log: 'Rücktritt erklärt — Regierung abgetreten.',
        key: 'ruecktritt',
      },
    ],
  };
}

/**
 * Löst das Misstrauensvotum-Event auf.
 * Wird aus resolveEvent aufgerufen wenn eventId === 'konstruktives_misstrauensvotum'.
 */
export function resolveMisstrauensvotum(
  state: GameState,
  choiceKey: string,
): GameState {
  if (choiceKey === 'stabilisieren') {
    // Koalition stabilisieren: Counter reset, moderate positive Effekte
    return {
      ...state,
      lowApprovalMonths: 0,
      misstrauensvotumAbgewendet: true,
    };
  }

  if (choiceKey === 'vertrauensfrage') {
    // Art. 68 GG: Erfolg abhängig von Koalitionsstabilität
    // Basis-Chance: coalition% + Zufallsfaktor
    const basisChance = state.coalition + nextRandom() * 20;
    const erfolg = basisChance > 45;

    if (erfolg) {
      return {
        ...state,
        lowApprovalMonths: 0,
        misstrauensvotumAbgewendet: true,
        coalition: Math.min(100, state.coalition + 15),
      };
    } else {
      // Vertrauensfrage verloren → Spielende
      return { ...state, gameOver: true, won: false, speed: 0 };
    }
  }

  if (choiceKey === 'ruecktritt') {
    return { ...state, gameOver: true, won: false, speed: 0 };
  }

  return state;
}

export function checkGameEnd(state: GameState, content?: ContentBundle): GameState {
  if (state.month > LEGISLATUR_MONATE) {
    const threshold = state.electionThreshold ?? DEFAULT_ELECTION_THRESHOLD;
    const wahlergebnis = state.wahlergebnis ?? state.wahlprognose ?? state.zust.g;

    if (content) {
      const finalized = finalisiereLegislaturBilanzAmSpielende(state, content);
      const sMitBilanz = { ...state, legislaturBilanz: finalized };
      const bilanzPunkte = finalized.bilanzPunkte ?? 0;
      const wahlbonus = berechneWahlbonus(wahlergebnis, threshold);
      const spielziel = berechneSpielzielErgebnis(sMitBilanz, content, bilanzPunkte, wahlbonus);
      const wahlUeberHuerde = wahlergebnis >= threshold;
      const won = istLegislaturErfolg(spielziel.gesamtpunkte);
      return {
        ...sMitBilanz,
        gameOver: true,
        won,
        legislaturErfolg: won,
        wahlUeberHuerde,
        spielziel,
        wahlergebnis: state.wahlergebnis ?? wahlergebnis,
        speed: 0,
      };
    }

    const wahlUeberHuerde = wahlergebnis >= threshold;
    const won = wahlUeberHuerde;
    return { ...state, gameOver: true, won, wahlUeberHuerde, speed: 0 };
  }

  // Koalitionsbruch
  if (state.coalition < MIN_KOALITION_FORTGANG) {
    return { ...state, gameOver: true, won: false, speed: 0 };
  }

  // Misstrauensvotum: aufeinanderfolgende Monate mit realer Mehrheitsbasis für die
  // Opposition (Sitzanteil + Koalitionsinstabilität; Zustimmung nur sekundär) (ab Monat 7)
  if (state.month > 6) {
    const lowMonths = state.lowApprovalMonths ?? 0;
    if (hatMisstrauensvotumMehrheitsbasis(state)) {
      const newLowMonths = lowMonths + 1;
      const complexity = state.complexity ?? 4;
      const misstrauensvotumAktiv = featureActive(complexity, 'konstruktives_misstrauensvotum');

      if (misstrauensvotumAktiv) {
        // Interaktives Misstrauensvotum: Event nach 4 Monaten, Game-Over nach 6 falls nicht gelöst
        if (newLowMonths >= MISSTRAUENSVOTUM_EVENT_MONATE && !state.activeEvent && !state.misstrauensvotumAbgewendet) {
          const event = buildMisstrauensvotumEvent(state);
          return {
            ...state,
            lowApprovalMonths: newLowMonths,
            activeEvent: event,
            ...withPause(state),
          };
        }
        // Trotzdem Hard-Game-Over nach 6 Monaten (Fallback)
        if (newLowMonths >= MISSTRAUENSVOTUM_MONATE) {
          return { ...state, gameOver: true, won: false, speed: 0, lowApprovalMonths: newLowMonths };
        }
      } else {
        // Legacy: direktes Game-Over nach 6 Monaten
        if (newLowMonths >= MISSTRAUENSVOTUM_MONATE) {
          return { ...state, gameOver: true, won: false, speed: 0, lowApprovalMonths: newLowMonths };
        }
      }
      return { ...state, lowApprovalMonths: newLowMonths };
    }
    // Reset counter wenn die Opposition keine reale Mehrheitsbasis mehr hat
    if (lowMonths > 0) {
      return { ...state, lowApprovalMonths: 0, misstrauensvotumAbgewendet: undefined };
    }
  }

  return state;
}
