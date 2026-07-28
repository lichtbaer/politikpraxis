/**
 * Vermittlungsausschuss-Mechanik (Art. 77 GG).
 *
 * Wenn ein Gesetz im Bundesrat blockiert wird, kann der Spieler den
 * Vermittlungsausschuss einberufen (20 PK). Der Ausgang ist offen und wird
 * bei Einberufung ausgewürfelt, gekoppelt an die durchschnittliche Beziehung
 * zu den Bundesrats-Fraktionen und abgelehnte Trade-off-Angebote:
 * voller Erfolg (Originaleffekte), Kompromiss (50% Effekte, wie bisher) oder
 * Scheitern (Gesetz fällt zurück in die Bundesrat-Blockade, PK verloren).
 * Nach 2 Monaten wird der vorab bestimmte Ausgang im Tick aufgelöst.
 */
import type { GameState, LawEffects, ContentBundle } from '../../types';
import { addLog } from '../../engine';
import { verbrauchePK } from '../../pk';
import { scheduleEffects } from '../economics/economy';
import { applyGesetzKosten } from '../economics/haushalt';
import { applyMilieuEffekte } from '../medien/milieus';
import { setPolitikfeldBeschluss } from '../politikfeldDruck';
import { checkProaktiveErfuellung } from '../ministerAgenden';
import { featureActive } from '../features';
import { applyGesetzMedienAkteureNachBeschluss } from '../medien/medienEvents';
import { nextRandom } from '../../rng';

const PK_VERMITTLUNG = 20;
const VERMITTLUNG_DELAY_MONATE = 2;
const EFFEKT_FAKTOR = 0.5;

/** Ausgang des Vermittlungsausschusses */
export type VermittlungAusgang = 'erfolg' | 'kompromiss' | 'scheitern';

/** Basis-Wahrscheinlichkeit für Erfolg/Scheitern bei völlig neutraler Beziehung (score 0.5) */
const VERMITTLUNG_PROB_BASIS = 0.15;
/** Spannweite, um die Erfolgs-/Scheitern-Chance je nach Beziehungs-Score verschoben wird */
const VERMITTLUNG_PROB_SPREAD = 0.6;
/** Abzug auf den Beziehungs-Score je abgelehntem Trade-off-Angebot einer BR-Fraktion */
const VERMITTLUNG_TRADEOFF_MALUS = 0.15;

/**
 * Beziehungs-Score (0–1) als Basis für die Ausgangs-Chancen: Durchschnitt der
 * Fraktions-Beziehungen, abzüglich eines Malus je abgelehntem Trade-off-Angebot
 * für dieses Gesetz.
 */
function berechneVermittlungsScore(state: GameState, lawId: string): number {
  const fraktionen = state.bundesratFraktionen ?? [];
  if (fraktionen.length === 0) return 0.5;
  const law = state.gesetze.find(g => g.id === lawId);
  let summe = 0;
  let ablehnungen = 0;
  for (const f of fraktionen) {
    summe += f.beziehung;
    if (law?.lobbyFraktionen?.[f.id]?.tradeoffAblehnen) ablehnungen++;
  }
  const avg = summe / fraktionen.length / 100;
  return Math.max(0, Math.min(1, avg - ablehnungen * VERMITTLUNG_TRADEOFF_MALUS));
}

/**
 * Wahrscheinlichkeiten für die drei möglichen Ausgänge, gekoppelt an die
 * BR-Fraktions-Beziehungen (SMA-276). Bei neutraler Beziehung (score 0.5)
 * ergibt sich ein offener Ausgang (~45/45/10); je besser/schlechter die
 * Beziehung, desto mehr verschiebt sich die Chance Richtung Erfolg/Scheitern.
 */
export function berechneVermittlungsChancen(
  state: GameState,
  lawId: string,
): Record<VermittlungAusgang, number> {
  const score = berechneVermittlungsScore(state, lawId);
  const erfolg = VERMITTLUNG_PROB_BASIS + VERMITTLUNG_PROB_SPREAD * score;
  const scheitern = VERMITTLUNG_PROB_BASIS + VERMITTLUNG_PROB_SPREAD * (1 - score);
  const kompromiss = Math.max(0, 1 - erfolg - scheitern);
  return { erfolg, kompromiss, scheitern };
}

/** Würfelt den Ausgang anhand der Chancen aus (kumulative Verteilung) */
function wuerfleVermittlungsAusgang(chancen: Record<VermittlungAusgang, number>): VermittlungAusgang {
  const r = nextRandom();
  if (r < chancen.erfolg) return 'erfolg';
  if (r < chancen.erfolg + chancen.kompromiss) return 'kompromiss';
  return 'scheitern';
}

/** Prüft ob Vermittlungsausschuss für ein Gesetz möglich ist */
export function kannVermitteln(state: GameState, lawId: string, complexity: number): boolean {
  if (!featureActive(complexity, 'vermittlungsausschuss')) return false;
  const law = state.gesetze.find(g => g.id === lawId);
  if (!law) return false;
  // Nur bei Bundesrat-Blockade (Zustimmungsgesetz) oder Einspruch (Einspruchsgesetz)
  if (law.blockiert !== 'bundesrat' && law.status !== 'br_einspruch') return false;
  // Nicht wenn bereits in Vermittlung
  if (state.vermittlungAktiv?.[lawId] != null) return false;
  // Genug PK?
  if (state.pk < PK_VERMITTLUNG) return false;
  return true;
}

/**
 * Startet den Vermittlungsausschuss — der Ausgang (Erfolg/Kompromiss/Scheitern) wird
 * hier bereits ausgewürfelt (gekoppelt an BR-Fraktions-Beziehungen) und erst nach
 * 2 Monaten im Tick aufgelöst; der Spieler erfährt das Ergebnis erst dann.
 */
export function vermittlungsausschuss(state: GameState, lawId: string, complexity: number): GameState {
  if (!kannVermitteln(state, lawId, complexity)) return state;

  const next = verbrauchePK(state, PK_VERMITTLUNG);
  if (!next) return state;

  // Gesetz-Status auf 'eingebracht' (in Vermittlung) setzen, Blockade aufheben
  const gesetze = next.gesetze.map(g =>
    g.id === lawId
      ? { ...g, status: 'eingebracht' as const, blockiert: null }
      : g,
  );

  const vermittlungAktiv = {
    ...(next.vermittlungAktiv ?? {}),
    [lawId]: next.month + VERMITTLUNG_DELAY_MONATE,
  };
  const ausgang = wuerfleVermittlungsAusgang(berechneVermittlungsChancen(next, lawId));
  const vermittlungAusgang = {
    ...(next.vermittlungAusgang ?? {}),
    [lawId]: ausgang,
  };

  const law = state.gesetze.find(g => g.id === lawId);
  return addLog(
    { ...next, gesetze, vermittlungAktiv, vermittlungAusgang },
    `Vermittlungsausschuss für ${law?.kurz ?? lawId} einberufen: Ausgang offen, Ergebnis in ${VERMITTLUNG_DELAY_MONATE} Monaten`,
    'info',
  );
}

/** Reduziert Law-Effekte um Faktor (für vermitteltes Gesetz) */
function reduziereEffekte(effekte: LawEffects): LawEffects {
  const result: LawEffects = {};
  for (const [key, val] of Object.entries(effekte)) {
    if (val != null) {
      result[key as keyof LawEffects] = +(val * EFFEKT_FAKTOR).toFixed(2);
    }
  }
  return result;
}

/**
 * Tick-Check: Vermittlungsausschuss abschließen wenn Frist erreicht.
 * Wird im Engine-Tick aufgerufen.
 */
export function tickVermittlungsausschuss(
  state: GameState,
  context?: {
    milieus?: { id: string; ideologie: { wirtschaft: number; gesellschaft: number; staat: number }; min_complexity: number }[];
    complexity?: number;
    gesetzRelationen?: Record<string, import('../../types').GesetzRelation[]>;
    content?: ContentBundle;
  },
): GameState {
  const aktiv = state.vermittlungAktiv;
  if (!aktiv || Object.keys(aktiv).length === 0) return state;

  let s = state;
  const verbleibend: Record<string, number> = {};

  const ausgangVerbleibend: Record<string, VermittlungAusgang> = {};

  for (const [lawId, fristMonat] of Object.entries(aktiv)) {
    if (s.month < fristMonat) {
      verbleibend[lawId] = fristMonat;
      const bestehenderAusgang = s.vermittlungAusgang?.[lawId];
      if (bestehenderAusgang) ausgangVerbleibend[lawId] = bestehenderAusgang;
      continue;
    }

    const lawIdx = s.gesetze.findIndex(g => g.id === lawId);
    if (lawIdx === -1) continue;

    const law = s.gesetze[lawIdx];
    // Fehlender Eintrag (z.B. Spielstand vor SMA-276) -> 'kompromiss' als bisheriges Standardverhalten
    const ausgang: VermittlungAusgang = s.vermittlungAusgang?.[lawId] ?? 'kompromiss';

    if (ausgang === 'scheitern') {
      // Vermittlung gescheitert: Gesetz fällt zurück in die Bundesrat-Blockade, keine Effekte/Kosten.
      const gesetze = s.gesetze.map((g, i) =>
        i === lawIdx ? { ...g, status: 'blockiert' as const, blockiert: 'bundesrat' as const } : g,
      );
      s = { ...s, gesetze };
      s = addLog(
        s,
        `Vermittlungsausschuss: ${law.kurz} gescheitert — der Bundesrat bleibt bei seiner Ablehnung`,
        'r',
      );
      continue;
    }

    const wirkungFaktor = ausgang === 'erfolg' ? 1 : EFFEKT_FAKTOR;
    const vermittelteEffekte = ausgang === 'erfolg' ? law.effekte : reduziereEffekte(law.effekte);

    const gesetze = s.gesetze.map((g, i) =>
      i === lawIdx
        ? { ...g, status: 'beschlossen' as const, effekte: vermittelteEffekte, wirkungFaktor }
        : g,
    );
    s = { ...s, gesetze };

    // Kosten und Effekte anwenden
    s = applyGesetzKosten(s, lawId);
    s = scheduleEffects(s, {
      effekte: vermittelteEffekte as Record<string, number>,
      lag: law.lag,
      kurz: `${law.kurz} (Vermittlung)`,
      gesetzId: lawId,
    });

    if (context?.milieus && context.complexity != null) {
      s = applyMilieuEffekte(s, lawId, context.milieus, context.complexity, context.gesetzRelationen);
    }
    if (law.politikfeldId) {
      s = setPolitikfeldBeschluss(s, law.politikfeldId);
    }
    s = checkProaktiveErfuellung(s, lawId);
    if (context?.content != null && context.complexity != null) {
      const lawNow = s.gesetze[lawIdx];
      s = applyGesetzMedienAkteureNachBeschluss(s, lawNow, context.complexity, context.content);
    }

    s = addLog(
      s,
      ausgang === 'erfolg'
        ? `Vermittlungsausschuss: ${law.kurz} mit vollem Erfolg beschlossen (Wirkung 100%)`
        : `Vermittlungsausschuss: ${law.kurz} als Kompromiss beschlossen (Wirkung −50%)`,
      'g',
    );
  }

  s = {
    ...s,
    vermittlungAktiv: Object.keys(verbleibend).length > 0 ? verbleibend : undefined,
    vermittlungAusgang: Object.keys(ausgangVerbleibend).length > 0 ? ausgangVerbleibend : undefined,
  };
  return s;
}
