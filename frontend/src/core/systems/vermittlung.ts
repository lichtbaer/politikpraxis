/**
 * Vermittlungsausschuss-Mechanik.
 *
 * Wenn ein Gesetz im Bundesrat blockiert wird, kann der Spieler den
 * Vermittlungsausschuss einberufen. Ergebnis: abgeschwächtes Gesetz
 * (50% Effekte) mit 2 Monaten Verzögerung und 20 PK Kosten.
 */
import type { GameState, Law, LawEffects } from '../types';
import { addLog } from '../engine';
import { verbrauchePK } from '../pk';
import { scheduleEffects } from './economy';
import { applyGesetzKosten } from './haushalt';
import { applyMilieuEffekte } from './milieus';
import { setPolitikfeldBeschluss } from './politikfeldDruck';
import { checkProaktiveErfuellung } from './ministerAgenden';
import { featureActive } from './features';

const PK_VERMITTLUNG = 20;
const VERMITTLUNG_DELAY_MONATE = 2;
const EFFEKT_FAKTOR = 0.5;

/** Prüft ob Vermittlungsausschuss für ein Gesetz möglich ist */
export function kannVermitteln(state: GameState, lawId: string, complexity: number): boolean {
  if (!featureActive(complexity, 'vermittlungsausschuss')) return false;
  const law = state.gesetze.find(g => g.id === lawId);
  if (!law) return false;
  // Nur bei Bundesrat-Blockade
  if (law.blockiert !== 'bundesrat') return false;
  // Nicht wenn bereits in Vermittlung
  if (state.vermittlungAktiv?.[lawId] != null) return false;
  // Genug PK?
  if (state.pk < PK_VERMITTLUNG) return false;
  return true;
}

/** Startet den Vermittlungsausschuss — Gesetz wird nach 2 Monaten mit halben Effekten beschlossen */
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

  const law = state.gesetze.find(g => g.id === lawId);
  return addLog(
    { ...next, gesetze, vermittlungAktiv },
    `Vermittlungsausschuss für ${law?.kurz ?? lawId}: Kompromiss in ${VERMITTLUNG_DELAY_MONATE} Monaten`,
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
    gesetzRelationen?: Record<string, import('../types').GesetzRelation[]>;
  },
): GameState {
  const aktiv = state.vermittlungAktiv;
  if (!aktiv || Object.keys(aktiv).length === 0) return state;

  let s = state;
  const verbleibend: Record<string, number> = {};

  for (const [lawId, fristMonat] of Object.entries(aktiv)) {
    if (s.month < fristMonat) {
      verbleibend[lawId] = fristMonat;
      continue;
    }

    // Vermittlung abgeschlossen: Gesetz beschließen mit halben Effekten
    const lawIdx = s.gesetze.findIndex(g => g.id === lawId);
    if (lawIdx === -1) continue;

    const law = s.gesetze[lawIdx];
    const vermittelteEffekte = reduziereEffekte(law.effekte);

    const gesetze = s.gesetze.map((g, i) =>
      i === lawIdx
        ? { ...g, status: 'beschlossen' as const, effekte: vermittelteEffekte, wirkungFaktor: EFFEKT_FAKTOR }
        : g,
    );
    s = { ...s, gesetze };

    // Kosten und Effekte anwenden
    s = applyGesetzKosten(s, lawId);
    s = scheduleEffects(s, {
      effekte: vermittelteEffekte as Record<string, number>,
      lag: law.lag,
      kurz: `${law.kurz} (Vermittlung)`,
    });

    if (context?.milieus && context.complexity != null) {
      s = applyMilieuEffekte(s, lawId, context.milieus, context.complexity, context.gesetzRelationen);
    }
    if (law.politikfeldId) {
      s = setPolitikfeldBeschluss(s, law.politikfeldId);
    }
    s = checkProaktiveErfuellung(s, lawId);

    s = addLog(
      s,
      `Vermittlungsausschuss: ${law.kurz} als Kompromiss beschlossen (Wirkung −50%)`,
      'g',
    );
  }

  s = { ...s, vermittlungAktiv: Object.keys(verbleibend).length > 0 ? verbleibend : undefined };
  return s;
}
